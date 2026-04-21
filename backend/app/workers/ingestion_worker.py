"""
workers/ingestion_worker.py — Celery task for background repository ingestion.
"""

import asyncio
import json
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
celery_app = Celery("ingestion_tasks")
celery_app.config_from_object("app.config.get_settings", namespace="CELERY")


async def _update_status(repo_id: str, status: RepoStatus, **kwargs) -> None:
    """Helper to update database Repository record."""
    async with AsyncSessionLocal() as session:
        stmt = update(Repository).where(Repository.repo_id == repo_id).values(status=status, **kwargs)
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
    await _update_status(repo_id, RepoStatus.CLONING, progress=10)

    # ── 1. Clone ───────────────────────────────────────────────────────────────
    try:
        clone_dir = clone_repo(url, repo_id, access_token)
    except Exception as e:
        logger.error("[%s] Clone failed: %s", repo_id, e)
        await _update_status(repo_id, RepoStatus.FAILED, error_message=str(e))
        return

    # ── 2. Filter files ────────────────────────────────────────────────────────
    source_files = list_source_files(clone_dir)
    file_count = len(source_files)
    await _update_status(repo_id, RepoStatus.PROCESSING, progress=30)

    if file_count == 0:
        logger.warning("[%s] No source files found.", repo_id)
        await _update_status(repo_id, RepoStatus.FAILED, error_message="No readable source files found.")
        return

    # ── 3. Chunk all files (Parallel) ─────────────────────────────────────────
    logger.info("[%s] Chunking %d files...", repo_id, file_count)
    
    chunk_tasks = [
        asyncio.to_thread(chunk_file, fp, repo_id, clone_dir) 
        for fp in source_files
    ]
    results = await asyncio.gather(*chunk_tasks)
    
    all_chunks = []
    for chunks in results:
        all_chunks.extend(chunks)

    chunk_count = len(all_chunks)
    await _update_status(repo_id, RepoStatus.PROCESSING, progress=60)

    # ── 4 & 5. Embed + FAISS index ─────────────────────────────────────────────
    async def progress_cb(pct: int, msg: str) -> None:
        await _update_status(repo_id, RepoStatus.PROCESSING, progress=pct)
        if task_self:
            task_self.update_state(state="PROGRESS", meta={"progress": pct, "message": msg})

    await embed_and_index(all_chunks, repo_id, progress_callback=progress_cb)

    # Store relative paths for the file explorer
    relative_files = [str(Path(f).relative_to(clone_dir)) for f in source_files]
    
    await _update_status(
        repo_id,
        RepoStatus.INDEXED,
        progress=100,
        indexed_at=datetime.now(timezone.utc),
        file_count=file_count,
        chunk_count=chunk_count,
        files=json.dumps(relative_files),
    )
    logger.info("[%s] Ingestion complete: %d files, %d chunks", repo_id, file_count, chunk_count)

    # cleanup_clone(repo_id) # DISABLED: Keep files for File Explorer & Architecture Graph


# ── Celery task ────────────────────────────────────────────────────────────────

@celery_app.task(bind=True, name="app.workers.ingestion_worker.process_repository")
def process_repository(self, repo_id: str, url: str, access_token: str) -> None:
    """Wrapper to run the async pipeline in a sync Celery worker."""
    asyncio.run(_run_ingestion_task(repo_id, url, access_token, task_self=self))
