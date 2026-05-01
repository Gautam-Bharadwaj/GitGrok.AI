"""
workers/ingestion_worker.py — Celery task for background repository ingestion.

OPTIMISED:
- Priority file ordering (entry points, configs first)
- Concurrent chunking with asyncio.gather
- Granular progress updates
"""

import asyncio
import logging
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from celery import Celery
from sqlalchemy import update

from app.database import AsyncSessionLocal
from app.models.repo import Repository, RepoStatus
from app.services.chunking_service import chunk_file
from app.services.embedding_service import embed_and_index
from app.services.github_service import clone_repo, list_source_files
from app.config import get_settings

logger = logging.getLogger(__name__)

# Celery App init (shared with main.py)
settings = get_settings()

celery_app = Celery(
    "ingestion_tasks",
    broker=settings.redis_url,
    backend=settings.redis_url
)
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

# Priority patterns — files matching these come first for faster initial indexing
_PRIORITY_PATTERNS = {
    "main.py", "app.py", "index.ts", "index.js", "index.tsx", "server.py",
    "server.ts", "server.js", "routes.py", "api.py", "config.py", "settings.py",
    "package.json", "pyproject.toml", "Cargo.toml", "go.mod",
    "README.md", "readme.md", "Dockerfile",
}

_PRIORITY_DIRS = {"src", "app", "lib", "core", "api", "routes", "services"}


def _priority_sort_key(path: str) -> int:
    """Sort key: lower = higher priority. Entry points and configs first."""
    name = Path(path).name
    parent = Path(path).parent.name

    if name in _PRIORITY_PATTERNS:
        return 0
    if parent in _PRIORITY_DIRS:
        return 1
    if name.endswith((".py", ".ts", ".tsx", ".js", ".jsx")):
        return 2
    return 3


async def _update_status(repo_id: str, status: RepoStatus, **kwargs) -> None:
    """Helper to update database Repository record."""
    async with AsyncSessionLocal() as session:
        stmt = (
            update(Repository)
            .where(Repository.id == repo_id)
            .values(status=status, **kwargs)
        )
        await session.execute(stmt)
        await session.commit()


async def _run_ingestion_task(
    repo_id: str,
    url: str,
    access_token: str,
    task_self: Any | None = None,
) -> None:
    """
    Full async ingestion pipeline — optimised for speed.
    """
    logger.info("[%s] Starting ingestion for: %s", repo_id, url)
    await _update_status(repo_id, RepoStatus.PROCESSING, progress_percent=5)

    # ── 1. Clone ───────────────────────────────────────────────────────────────
    try:
        clone_dir = await asyncio.to_thread(clone_repo, url, repo_id, access_token)
    except Exception as e:
        logger.error("[%s] Clone failed: %s", repo_id, e)
        await _update_status(repo_id, RepoStatus.FAILED, error_message=str(e))
        return

    await _update_status(repo_id, RepoStatus.PROCESSING, progress_percent=15)

    # ── 2. Filter + prioritise files ──────────────────────────────────────────
    clone_root = Path(clone_dir)
    source_files = await asyncio.to_thread(list_source_files, clone_dir)

    # Sort by priority — important files first
    source_files.sort(key=_priority_sort_key)

    file_count = len(source_files)
    await _update_status(repo_id, RepoStatus.PROCESSING, progress_percent=20)

    if file_count == 0:
        logger.warning("[%s] No source files found.", repo_id)
        await _update_status(repo_id, RepoStatus.FAILED, error_message="No readable source files found.")
        return

    logger.info("[%s] Found %d source files (priority-sorted)", repo_id, file_count)

    # ── 3. Chunk all files (Parallel with concurrency limit) ──────────────────
    logger.info("[%s] Chunking %d files...", repo_id, file_count)

    # Use a semaphore to limit concurrent file reads (avoid fd exhaustion)
    sem = asyncio.Semaphore(32)

    async def _chunk_with_sem(fp: str) -> list:
        async with sem:
            return await asyncio.to_thread(chunk_file, Path(fp), repo_id, clone_root)

    chunk_tasks = [_chunk_with_sem(fp) for fp in source_files]
    results = await asyncio.gather(*chunk_tasks)

    all_chunks = []
    for chunks in results:
        all_chunks.extend(chunks)

    chunk_count = len(all_chunks)
    await _update_status(repo_id, RepoStatus.PROCESSING, progress_percent=50)
    logger.info("[%s] Generated %d chunks from %d files", repo_id, chunk_count, file_count)

    # ── 4 & 5. Embed + FAISS index (concurrent batches) ───────────────────────
    async def progress_cb(pct: int, msg: str) -> None:
        await _update_status(repo_id, RepoStatus.PROCESSING, progress_percent=pct)
        if task_self:
            task_self.update_state(state="PROGRESS", meta={"progress": pct, "message": msg})

    await embed_and_index(all_chunks, repo_id, progress_callback=progress_cb)

    # Store relative paths for the file explorer
    # Build a list of unique file paths for the file tree
    # (Unused locally but could be saved to DB)
    
    await _update_status(
        repo_id,
        RepoStatus.INDEXED,
        progress_percent=100,
        indexed_at=datetime.now(UTC),
        file_count=file_count,
        chunk_count=chunk_count,
    )
    logger.info("[%s] Ingestion complete: %d files, %d chunks", repo_id, file_count, chunk_count)

    # cleanup_clone(repo_id) # DISABLED: Keep files for File Explorer & Architecture Graph


# ── Celery task ────────────────────────────────────────────────────────────────

@celery_app.task(bind=True, name="app.workers.ingestion_worker.ingest_repository")
def ingest_repository(self, repo_id: str, url: str, access_token: str) -> None:
    """Wrapper to run the async pipeline in a sync Celery worker."""
    asyncio.run(_run_ingestion_task(repo_id, url, access_token, task_self=self))
