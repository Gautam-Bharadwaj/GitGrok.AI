"""
services/embedding_service.py — Batch-embeds CodeChunks using OpenAI's
text-embedding-3-small model and stores the resulting FAISS index to disk.
"""

import asyncio
import logging
import pickle
from pathlib import Path
from typing import Any

import numpy as np
import faiss
from openai import AsyncOpenAI

from app.config import get_settings
from app.services.chunking_service import CodeChunk

logger = logging.getLogger(__name__)
settings = get_settings()

# Embedding dimension for text-embedding-3-small
EMBED_DIM = 1536
BATCH_SIZE = 100  # Max chunks per OpenAI embeddings request


def _get_client() -> AsyncOpenAI:
    """Return a fresh AsyncOpenAI client (key read from settings)."""
    return AsyncOpenAI(api_key=settings.openai_api_key)


def _index_dir(repo_id: str) -> Path:
    """Deterministic directory for a repo's FAISS index."""
    d = Path(settings.faiss_index_dir) / repo_id
    d.mkdir(parents=True, exist_ok=True)
    return d


async def _embed_texts(client: AsyncOpenAI, texts: list[str]) -> list[list[float]]:
    """
    Send up to BATCH_SIZE texts to the OpenAI embedding API.

    Returns a list of float vectors, one per input text.
    """
    response = await client.embeddings.create(
        model=settings.embedding_model,
        input=texts,
    )
    return [item.embedding for item in response.data]


def _build_embedding_input(chunk: CodeChunk) -> str:
    """
    Prepend rich metadata before embedding to improve retrieval recall.
    Format recommended by OpenAI for code semantic search.
    """
    return (
        f"File: {chunk.file_path}\n"
        f"Type: {chunk.chunk_type}\n"
        f"Name: {chunk.name}\n\n"
        f"{chunk.content}"
    )


async def embed_and_index(
    chunks: list[CodeChunk],
    repo_id: str,
    progress_callback: Any = None,
) -> dict[str, Any]:
    """
    Embed *chunks* in batches, build a FAISS IndexFlatIP, and persist to disk.

    Args:
        chunks:            List of CodeChunk objects (content must be populated).
        repo_id:           Repository identifier (used for storage path).
        progress_callback: Optional async callable(percent: int, message: str).

    Returns:
        Dict containing chunk_count, index_path, metadata_path.
    """
    client = _get_client()
    all_vectors: list[list[float]] = []
    metadata_list: list[dict] = []

    total = len(chunks)
    logger.info("Embedding %d chunks for repo %s", total, repo_id)

    for batch_start in range(0, total, BATCH_SIZE):
        batch = chunks[batch_start : batch_start + BATCH_SIZE]
        texts = [_build_embedding_input(c) for c in batch]

        try:
            vectors = await _embed_texts(client, texts)
        except Exception as exc:
            logger.error("Embedding batch %d failed: %s", batch_start, exc)
            raise

        all_vectors.extend(vectors)
        for chunk, vec in zip(batch, vectors):
            chunk.embedding = vec
            metadata_list.append(chunk.metadata_dict())

        pct = int(60 + (batch_start + len(batch)) / total * 30)  # 60-90 %
        if progress_callback:
            await progress_callback(pct, f"Embedded {batch_start + len(batch)}/{total} chunks")

        # Polite rate-limit buffer between batches
        if batch_start + BATCH_SIZE < total:
            await asyncio.sleep(0.3)

    # ── Build FAISS index ──────────────────────────────────────────────────────
    matrix = np.array(all_vectors, dtype=np.float32)
    # Normalise for cosine similarity via inner product
    faiss.normalize_L2(matrix)

    index = faiss.IndexFlatIP(EMBED_DIM)
    index.add(matrix)

    # ── Persist ────────────────────────────────────────────────────────────────
    idx_dir = _index_dir(repo_id)
    index_path = idx_dir / "index.faiss"
    meta_path = idx_dir / "metadata.pkl"

    faiss.write_index(index, str(index_path))
    with open(meta_path, "wb") as fh:
        pickle.dump(metadata_list, fh)

    logger.info(
        "FAISS index saved: %d vectors → %s", index.ntotal, index_path
    )
    return {
        "chunk_count": index.ntotal,
        "index_path": str(index_path),
        "metadata_path": str(meta_path),
    }


def load_index(repo_id: str) -> tuple[faiss.Index, list[dict]]:
    """
    Load a persisted FAISS index and its chunk metadata from disk.

    Returns:
        (faiss_index, list_of_metadata_dicts)

    Raises:
        FileNotFoundError: if the index has not been built yet.
    """
    idx_dir = _index_dir(repo_id)
    index_path = idx_dir / "index.faiss"
    meta_path = idx_dir / "metadata.pkl"

    if not index_path.exists() or not meta_path.exists():
        raise FileNotFoundError(
            f"No FAISS index found for repo '{repo_id}'. Has ingestion completed?"
        )

    index = faiss.read_index(str(index_path))
    with open(meta_path, "rb") as fh:
        metadata = pickle.load(fh)  # noqa: S301 — trusted local file

    logger.info("Loaded FAISS index: %d vectors for repo %s", index.ntotal, repo_id)
    return index, metadata


def delete_index(repo_id: str) -> None:
    """Remove the FAISS index and metadata for *repo_id* from disk."""
    idx_dir = Path(settings.faiss_index_dir) / repo_id
    if idx_dir.exists():
        import shutil
        shutil.rmtree(idx_dir, ignore_errors=True)
        logger.info("Deleted FAISS index dir: %s", idx_dir)
