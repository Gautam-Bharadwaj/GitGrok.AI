"""
workers/ingestion_worker.py — Celery task for asynchronous repository ingestion.

Pipeline:
  1. Clone repository (shallow)
  2. Filter + discover source files
  3. Chunk each file (AST / sliding window / semantic)
  4. Batch-embed via OpenAI
  5. Build and persist FAISS index
  6. Update DB status + emit progress via Redis pub/sub

The worker is completely decoupled from the web process and can be
horizontally scaled.
"""

import asyncio
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from celery import Celery
from sqlalchemy import update

from app.config import get_settings
from app.database import AsyncSessionLocal
from app.models.repo import Repository, RepoStatus
from app.services.chunking_service import chunk_file
from app.services.embedding_service import embed_and_index
from app.services.github_service import cleanup_clone, clone_repository, get_clone_dir
from app.utils.file_filter import collect_source_files

logger = logging.getLogger(__name__)
settings = get_settings()

# ── Celery app ─────────────────────────────────────────────────────────────────
celery_app = Celery(
    "rag_worker",
    broker=settings.redis_url,
    backend=settings.redis_url,
)
celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_track_started=True,
    worker_prefetch_multiplier=1,
    task_acks_late=True,
)


# ── Async DB helpers (run inside asyncio.run()) ────────────────────────────────

async def _update_status(
    repo_id: str, status: RepoStatus, progress: int = 0, **kwargs: Any
) -> None:
    """Update repository row in the DB."""
    async with AsyncSessionLocal() as session:
        values: dict[str, Any] = {
            "status": status,
            "progress_percent": progress,
            **kwargs,
        }
        await session.execute(
            update(Repository).where(Repository.id == repo_id).values(**values)
        )
        await session.commit()


async def _run_ingestion(
    repo_id: str,
    url: str,
    access_token: str,
    task_self: Any,
) -> None:
    """
    Full async ingestion pipeline.  Called from the Celery sync task wrapper.
    """
    await _update_status(repo_id, RepoStatus.PROCESSING, progress=5)

    # ── 1. Clone ───────────────────────────────────────────────────────────────
    logger.info("[%s] Starting clone: %s", repo_id, url)
    clone_info: dict[str, Any] = {}

    async for event in clone_repository(repo_id, url, access_token):
        if event["event"] == "clone_complete":
            clone_info = event["data"]

    if not clone_info:
        raise RuntimeError("Clone produced no output — possible network failure.")

    await _update_status(repo_id, RepoStatus.PROCESSING, progress=20)

    # ── 2. Discover files ──────────────────────────────────────────────────────
    clone_dir = get_clone_dir(repo_id)
    source_files = collect_source_files(clone_dir)
    file_count = len(source_files)
    logger.info("[%s] Found %d source files", repo_id, file_count)
    await _update_status(
        repo_id, RepoStatus.PROCESSING, progress=30, file_count=file_count
    )

    # ── 3. Chunk all files ─────────────────────────────────────────────────────
    all_chunks = []
    for fp in source_files:
        chunks = chunk_file(fp, repo_id, clone_dir)
        all_chunks.extend(chunks)

    chunk_count = len(all_chunks)
    logger.info("[%s] Generated %d chunks from %d files", repo_id, chunk_count, file_count)
    await _update_status(
        repo_id, RepoStatus.PROCESSING, progress=55, chunk_count=chunk_count
    )

    if chunk_count == 0:
        raise RuntimeError("No chunks generated — repository may contain only binary files.")

    # ── 4 & 5. Embed + FAISS index ─────────────────────────────────────────────
    async def progress_cb(pct: int, msg: str) -> None:
        await _update_status(repo_id, RepoStatus.PROCESSING, progress=pct)
        task_self.update_state(state="PROGRESS", meta={"progress": pct, "message": msg})

    await embed_and_index(all_chunks, repo_id, progress_callback=progress_cb)

    # ── 6. Mark INDEXED ───────────────────────────────────────────────────────
    await _update_status(
        repo_id,
        RepoStatus.INDEXED,
        progress=100,
        indexed_at=datetime.now(timezone.utc),
        file_count=file_count,
        chunk_count=chunk_count,
    )
    logger.info("[%s] Ingestion complete: %d files, %d chunks", repo_id, file_count, chunk_count)

    # ── Cleanup temp clone ─────────────────────────────────────────────────────
    cleanup_clone(repo_id)


# ── Celery task ────────────────────────────────────────────────────────────────

@celery_app.task(bind=True, max_retries=3, default_retry_delay=30)
def ingest_repository(
    self,
    repo_id: str,
    url: str,
    access_token: str = "",
) -> dict[str, Any]:
    """
    Celery task that wraps the async ingestion pipeline.

    Args:
        repo_id:      UUID of the Repository row.
        url:          GitHub repository URL.
        access_token: Optional GitHub PAT for private repos.

    Returns:
        {"repo_id": repo_id, "status": "INDEXED"}

    Raises:
        Retries up to 3 times on transient failures.
    """
    try:
        asyncio.run(_run_ingestion(repo_id, url, access_token, self))
        return {"repo_id": repo_id, "status": "INDEXED"}
    except Exception as exc:
        logger.error("[%s] Ingestion failed: %s", repo_id, exc, exc_info=True)

        # Persist failure in DB
        asyncio.run(
            _update_status(
                repo_id,
                RepoStatus.FAILED,
                progress=0,
                error_message=str(exc)[:2048],
            )
        )

        # Retry with exponential back-off
        raise self.retry(exc=exc, countdown=30 * (2 ** self.request.retries))
