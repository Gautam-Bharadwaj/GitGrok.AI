"""
services/retrieval_service.py — Semantic retrieval with MMR re-ranking and
per-query file-relevance boosting.
"""

import logging
from typing import Any

import faiss
import numpy as np

from app.config import get_settings
from app.services.embedding_service import embed_query, load_index

logger = logging.getLogger(__name__)
settings = get_settings()


def _mmr(
    query_vec: np.ndarray,
    candidate_vecs: np.ndarray,
    candidate_meta: list[dict],
    top_k: int,
    lambda_: float = 0.6,
) -> list[dict]:
    """
    Maximal Marginal Relevance re-ranking.

    Balances relevance to the query (lambda_) against diversity
    among already-selected chunks (1 - lambda_).

    Args:
        query_vec:      (1, dim) normalised query vector.
        candidate_vecs: (n, dim) normalised candidate vectors.
        candidate_meta: Corresponding metadata dicts.
        top_k:          Number of chunks to return.
        lambda_:        Relevance weight (0 = max diversity, 1 = greedy relevant).

    Returns:
        List of selected metadata dicts.
    """
    relevance = (candidate_vecs @ query_vec.T).flatten()  # cosine similarity
    selected_indices: list[int] = []
    remaining = list(range(len(candidate_meta)))

    for _ in range(min(top_k, len(candidate_meta))):
        if not remaining:
            break
        if not selected_indices:
            # First pick: purely most relevant
            best_idx = max(remaining, key=lambda i: relevance[i])
        else:
            selected_vecs = candidate_vecs[selected_indices]
            best_idx = max(
                remaining,
                key=lambda i: lambda_ * relevance[i]
                - (1 - lambda_) * (candidate_vecs[i] @ selected_vecs.T).max(),
            )
        selected_indices.append(best_idx)
        remaining.remove(best_idx)

    return [candidate_meta[i] for i in selected_indices]


def _mentions_file(query: str, meta: dict) -> bool:
    """Return True if the query text references the file in *meta*."""
    file_lower = meta.get("file_path", "").lower()
    stem = file_lower.rsplit("/", 1)[-1].rsplit(".", 1)[0]
    return stem in query.lower() if stem else False


async def retrieve(
    query: str,
    repo_id: str,
    top_k: int | None = None,
) -> list[dict[str, Any]]:
    """
    Full retrieval pipeline:
    1. Embed the query.
    2. ANN search in FAISS (fetch 3× top_k candidates).
    3. MMR re-ranking for diversity.
    4. File-mention boost (chunks from explicitly named files get prioritised).
    5. Token budget truncation.

    Args:
        query:  Natural-language developer question.
        repo_id: Repository being queried.
        top_k:  Number of chunks to return (defaults to settings.top_k_retrieval).

    Returns:
        List of chunk metadata dicts (content + file/line info).
    """
    if top_k is None:
        top_k = settings.top_k_retrieval

    index, metadata = load_index(repo_id)

    if index.ntotal == 0:
        logger.warning("Empty FAISS index for repo %s", repo_id)
        return []



    query_vec = await embed_query(query)

    # Fetch more candidates than needed for MMR
    n_candidates = min(index.ntotal, top_k * 3)
    scores, indices = index.search(query_vec, n_candidates)

    valid_mask = indices[0] >= 0
    candidate_indices = indices[0][valid_mask].tolist()
    candidate_meta = [metadata[i] for i in candidate_indices]

    # Retrieve the stored vectors for MMR (re-read from index)
    candidate_vecs = np.vstack(
        [np.array(metadata[i].get("_vec", [0.0] * 1536), dtype=np.float32) for i in candidate_indices]
    ) if all("_vec" in metadata[i] for i in candidate_indices) else \
        _reconstruct_vecs(index, candidate_indices)

    mmr_results = _mmr(query_vec, candidate_vecs, candidate_meta, top_k)

    # File-mention boost: move explicitly referenced files to front
    boosted = [c for c in mmr_results if _mentions_file(query, c)]
    rest = [c for c in mmr_results if not _mentions_file(query, c)]
    final = (boosted + rest)[:top_k]

    logger.debug(
        "Retrieved %d chunks for query '%s…' (repo=%s)", len(final), query[:50], repo_id
    )
    return final


def _reconstruct_vecs(index: faiss.Index, indices: list[int]) -> np.ndarray:
    """
    Reconstruct stored vectors from a FAISS IndexFlatIP.

    IndexFlatIP supports reconstruct() directly.
    """
    dim = index.d
    vecs = np.zeros((len(indices), dim), dtype=np.float32)
    for j, idx in enumerate(indices):
        index.reconstruct(idx, vecs[j])
    return vecs


def build_context(
    chunks: list[dict[str, Any]],
    max_tokens: int | None = None,
) -> str:
    """
    Build a formatted context string from retrieved chunks, respecting the
    token budget (truncates least-relevant chunks first).

    Args:
        chunks:     Ordered list of chunk metadata dicts (most relevant first).
        max_tokens: Token budget (defaults to settings.max_context_tokens).

    Returns:
        Formatted context string ready for injection into the LLM prompt.
    """
    from app.utils.token_counter import count_tokens

    if max_tokens is None:
        max_tokens = settings.max_context_tokens

    parts: list[str] = []
    used_tokens = 0

    for chunk in chunks:
        name_tag = f" [{chunk.get('name', '')}]" if chunk.get("name") else ""
        header = (
            f"--- {chunk['file_path']}:L{chunk['start_line']}-{chunk['end_line']}"
            f"{name_tag} ---"
        )
        block = f"{header}\n```{chunk.get('language', '')}\n{chunk['content']}\n```"
        block_tokens = count_tokens(block)

        if used_tokens + block_tokens > max_tokens:
            logger.debug("Context budget reached at chunk %d/%d", len(parts) + 1, len(chunks))
            break

        parts.append(block)
        used_tokens += block_tokens

    return "\n\n".join(parts)
