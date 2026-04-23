"""
workers/ingestion_worker.py — Celery task for background repository ingestion.
"""

import asyncio
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from celery import Celery
from sqlalchemy import update

from app.database import AsyncSessionLocal
from app.models.repo import Repository, RepoStatus
from app.services.chunking_service import chunk_file
from app.services.embedding_service import embed_and_index
from app.services.github_service import clone_repo, list_source_files, cleanup_clone

logger = logging.getLogger(__name__)

# Celery App init (shared with main.py)
from app.config import get_settings
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
    task_self: Optional[Any] = None,
) -> None:
    """
    Full async ingestion pipeline.
    """
    logger.info("[%s] Starting ingestion for: %s", repo_id, url)
    await _update_status(repo_id, RepoStatus.PROCESSING, progress_percent=10)

    # ── 1. Clone ───────────────────────────────────────────────────────────────
    try:
        clone_dir = clone_repo(url, repo_id, access_token)
    except Exception as e:
        logger.error("[%s] Clone failed: %s", repo_id, e)
        await _update_status(repo_id, RepoStatus.FAILED, error_message=str(e))
        return

    # ── 2. Filter files ────────────────────────────────────────────────────────
    clone_root = Path(clone_dir)
    source_files = list_source_files(clone_dir)
    file_count = len(source_files)
    await _update_status(repo_id, RepoStatus.PROCESSING, progress_percent=30)

    if file_count == 0:
        logger.warning("[%s] No source files found.", repo_id)
        await _update_status(repo_id, RepoStatus.FAILED, error_message="No readable source files found.")
        return

    # ── 3. Chunk all files (Parallel) ─────────────────────────────────────────
    logger.info("[%s] Chunking %d files...", repo_id, file_count)
    
    chunk_tasks = [
        asyncio.to_thread(chunk_file, Path(fp), repo_id, clone_root)
        for fp in source_files
    ]
    results = await asyncio.gather(*chunk_tasks)
    
    all_chunks = []
    for chunks in results:
        all_chunks.extend(chunks)

    chunk_count = len(all_chunks)
    await _update_status(repo_id, RepoStatus.PROCESSING, progress_percent=60)

    # ── 4 & 5. Embed + FAISS index ─────────────────────────────────────────────
    async def progress_cb(pct: int, msg: str) -> None:
        await _update_status(repo_id, RepoStatus.PROCESSING, progress_percent=pct)
        if task_self:
            task_self.update_state(state="PROGRESS", meta={"progress": pct, "message": msg})

    await embed_and_index(all_chunks, repo_id, progress_callback=progress_cb)

    # Store relative paths for the file explorer
    await _update_status(
        repo_id,
        RepoStatus.INDEXED,
        progress_percent=100,
        indexed_at=datetime.now(timezone.utc),
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
