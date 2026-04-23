"""
services/embedding_service.py — Batch-embeds CodeChunks using OpenAI's
text-embedding-3-small model and stores the resulting FAISS index to disk.
Using OpenAI for embeddings is RAM-efficient for cloud hosting (Render Free).

OPTIMISED: Concurrent batch embedding (4 parallel batches) for 3-4× faster ingestion.
"""

import asyncio
import hashlib
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

# Number of concurrent embedding batches
CONCURRENT_BATCHES = 4


def _get_client() -> AsyncOpenAI:
    return AsyncOpenAI(api_key=settings.openai_api_key)


def _use_local_embedding_fallback() -> bool:
    key = (settings.openai_api_key or "").strip().lower()
    return not key or key == "your_openai_api_key_here"


def _local_embedding(text: str) -> list[float]:
    """
    Deterministic local embedding fallback for development when OpenAI key is missing.
    Produces a stable normalized vector from text content.
    """
    digest = hashlib.sha256(text.encode("utf-8", errors="ignore")).digest()
    seed = int.from_bytes(digest[:8], "little", signed=False)
    rng = np.random.default_rng(seed)
    vec = rng.standard_normal(EMBED_DIM, dtype=np.float32)
    norm = np.linalg.norm(vec)
    if norm > 0:
        vec = vec / norm
    return vec.tolist()

def _index_dir(repo_id: str) -> Path:
    d = Path(settings.faiss_index_dir) / repo_id
    d.mkdir(parents=True, exist_ok=True)
    return d

async def _embed_texts(client: AsyncOpenAI, texts: list[str]) -> list[list[float]]:
    if _use_local_embedding_fallback():
        logger.warning("OpenAI key missing/placeholder; using local embedding fallback.")
        return [_local_embedding(t) for t in texts]

    response = await client.embeddings.create(
        model=settings.embedding_model,
        input=texts,
    )
    return [item.embedding for item in response.data]


async def _embed_batch(
    client: AsyncOpenAI,
    chunks: list[CodeChunk],
    batch_idx: int,
) -> tuple[int, list[list[float]], list[dict]]:
    """Embed a single batch and return (batch_idx, vectors, metadata)."""
    texts = [
        f"File: {c.file_path}\nType: {c.chunk_type}\nName: {c.name}\n\n{c.content}"
        for c in chunks
    ]
    vectors = await _embed_texts(client, texts)
    metadata = [c.metadata_dict() for c in chunks]
    return batch_idx, vectors, metadata


async def embed_and_index(
    chunks: list[CodeChunk],
    repo_id: str,
    progress_callback: Any = None,
) -> dict[str, Any]:
    client = _get_client()
    total = len(chunks)
    logger.info("Embedding %d chunks for repo %s (concurrent=%d)", total, repo_id, CONCURRENT_BATCHES)

    batch_size = max(1, settings.embedding_batch_size)

    # Split into batches
    batches: list[tuple[int, list[CodeChunk]]] = []
    for i, batch_start in enumerate(range(0, total, batch_size)):
        batch = chunks[batch_start : batch_start + batch_size]
        batches.append((i, batch))

    # Process batches concurrently using a semaphore for rate limiting
    semaphore = asyncio.Semaphore(CONCURRENT_BATCHES)
    all_results: list[tuple[int, list[list[float]], list[dict]]] = []
    completed = 0

    async def _process_with_semaphore(batch_idx: int, batch_chunks: list[CodeChunk]):
        nonlocal completed
        async with semaphore:
            result = await _embed_batch(client, batch_chunks, batch_idx)
            completed += len(batch_chunks)
            pct = int(60 + completed / total * 30)
            if progress_callback:
                await progress_callback(pct, f"Embedded {completed}/{total} chunks")
            return result

    tasks = [
        _process_with_semaphore(idx, batch_chunks)
        for idx, batch_chunks in batches
    ]
    all_results = await asyncio.gather(*tasks)

    # Sort results by batch index to maintain order
    all_results.sort(key=lambda x: x[0])

    all_vectors: list[list[float]] = []
    metadata_list: list[dict] = []
    for _, vectors, metadata in all_results:
        all_vectors.extend(vectors)
        metadata_list.extend(metadata)

    # ── Build FAISS index ──────────────────────────────────────────────────────
    matrix = np.array(all_vectors, dtype=np.float32)
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

    return {
        "chunk_count": index.ntotal,
        "index_path": str(index_path),
        "metadata_path": str(meta_path),
    }

async def embed_query(query: str) -> np.ndarray:
    client = _get_client()
    response = await client.embeddings.create(
        model=settings.embedding_model,
        input=[query],
    )
    vec = np.array(response.data[0].embedding, dtype=np.float32).reshape(1, -1)
    faiss.normalize_L2(vec)
    return vec

def load_index(repo_id: str) -> tuple[faiss.Index, list[dict]]:
    idx_dir = _index_dir(repo_id)
    index_path = idx_dir / "index.faiss"
    meta_path = idx_dir / "metadata.pkl"
    if not index_path.exists() or not meta_path.exists():
        raise FileNotFoundError(f"Index not found for {repo_id}")

    index = faiss.read_index(str(index_path))
    with open(meta_path, "rb") as fh:
        metadata = pickle.load(fh)
    return index, metadata

def delete_index(repo_id: str) -> None:
    idx_dir = Path(settings.faiss_index_dir) / repo_id
    if idx_dir.exists():
        import shutil
        shutil.rmtree(idx_dir, ignore_errors=True)
