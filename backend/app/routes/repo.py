"""
routes/repo.py — Repository management endpoints.

POST   /api/v1/repo/load          — Enqueue repo ingestion
GET    /api/v1/repo/status/{id}   — Poll ingestion progress
GET    /api/v1/repo/list          — List all indexed repos
DELETE /api/v1/repo/{id}          — Delete repo + index + chat history
"""

import asyncio
import logging
import re
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models.chat import ChatMessage, ChatSession
from app.models.repo import Repository, RepoStatus
from app.services.cache_service import invalidate_repo_cache
from app.services.embedding_service import delete_index
from app.workers.ingestion_worker import _run_ingestion_task, ingest_repository

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/repo", tags=["Repository"])
GITHUB_URL_RE = re.compile(r"^(https://github\.com/[\w.-]+/[\w.-]+(?:\.git)?|git@github\.com:[\w.-]+/[\w.-]+(?:\.git)?)$")
settings = get_settings()


# ── Request / Response schemas ─────────────────────────────────────────────────

class LoadRepoRequest(BaseModel):
    url: str = Field(..., description="GitHub HTTPS or SSH URL")
    access_token: str | None = Field(None, description="GitHub PAT for private repos")


class LoadRepoResponse(BaseModel):
    repo_id: str
    status: str = "PENDING"


class RepoStatusResponse(BaseModel):
    repo_id: str
    status: RepoStatus
    progress_percent: int
    file_count: int
    chunk_count: int
    error_message: str | None
    indexed_at: datetime | None


class RepoSummary(BaseModel):
    repo_id: str
    name: str
    url: str
    status: RepoStatus
    chunk_count: int
    indexed_at: datetime | None


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post("/load", response_model=LoadRepoResponse, status_code=status.HTTP_202_ACCEPTED)
async def load_repository(
    body: LoadRepoRequest,
    db: AsyncSession = Depends(get_db),
) -> LoadRepoResponse:
    """
    Enqueue a repository for ingestion.

    Creates a DB record with PENDING status and dispatches the Celery task.
    Returns immediately with the new repo_id; poll /status/{repo_id} for updates.
    """
    if not GITHUB_URL_RE.match(body.url.strip()):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="URL must be a valid GitHub HTTPS or SSH URL.",
        )

    repo_id = str(uuid.uuid4())
    # Derive a short display name from the URL
    name = body.url.rstrip("/").rstrip(".git").rsplit("/", 1)[-1] or "repository"

    repo = Repository(
        id=repo_id,
        name=name,
        url=body.url,
        status=RepoStatus.PENDING,
        progress_percent=0,
    )
    db.add(repo)
    await db.flush()

    # Dispatch ingestion task.
    # In local/dev mode, run inline so the app works without a separate Celery worker.
    if settings.ingestion_mode.lower() == "celery":
        ingest_repository.apply_async(
            kwargs={
                "repo_id": repo_id,
                "url": body.url,
                "access_token": body.access_token or "",
            },
            task_id=repo_id,
        )
    else:
        asyncio.create_task(
            _run_ingestion_task(
                repo_id=repo_id,
                url=body.url,
                access_token=body.access_token or "",
            )
        )

    logger.info("Enqueued ingestion task for repo %s (%s)", repo_id, body.url)
    return LoadRepoResponse(repo_id=repo_id)


@router.get("/list", response_model=list[RepoSummary])
async def list_repositories(
    db: AsyncSession = Depends(get_db),
) -> list[RepoSummary]:
    """Return all repositories ordered by creation date (newest first)."""
    result = await db.execute(
        select(Repository).order_by(Repository.created_at.desc())
    )
    repos = result.scalars().all()
    return [
        RepoSummary(
            repo_id=r.id,
            name=r.name,
            url=r.url,
            status=r.status,
            chunk_count=r.chunk_count,
            indexed_at=r.indexed_at,
        )
        for r in repos
    ]


@router.get("/status/{repo_id}", response_model=RepoStatusResponse)
async def get_repo_status(
    repo_id: str,
    db: AsyncSession = Depends(get_db),
) -> RepoStatusResponse:
    """Return the current ingestion status and progress for *repo_id*."""
    row = await db.get(Repository, repo_id)
    if row is None:
        raise HTTPException(status_code=404, detail=f"Repository '{repo_id}' not found.")
    return RepoStatusResponse(
        repo_id=row.id,
        status=row.status,
        progress_percent=row.progress_percent,
        file_count=row.file_count,
        chunk_count=row.chunk_count,
        error_message=row.error_message,
        indexed_at=row.indexed_at,
    )


@router.delete("/{repo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_repository(
    repo_id: str,
    db: AsyncSession = Depends(get_db),
) -> None:
    """
    Permanently delete a repository:
    1. Remove FAISS index from disk.
    2. Delete all chat sessions + messages from DB.
    3. Delete the Repository row.
    4. Invalidate Redis cache entries.
    """
    row = await db.get(Repository, repo_id)
    if row is None:
        raise HTTPException(status_code=404, detail=f"Repository '{repo_id}' not found.")

    # 1. FAISS index
    try:
        delete_index(repo_id)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Could not delete FAISS index for %s: %s", repo_id, exc)

    # 2. Chat data
    sessions_result = await db.execute(
        select(ChatSession).where(ChatSession.repo_id == repo_id)
    )
    sessions = sessions_result.scalars().all()
    for session in sessions:
        await db.execute(
            delete(ChatMessage).where(ChatMessage.session_id == session.id)
        )
    await db.execute(delete(ChatSession).where(ChatSession.repo_id == repo_id))

    # 3. Repo row
    await db.delete(row)

    # 4. Cache
    await invalidate_repo_cache(repo_id)

    logger.info("Deleted repository %s", repo_id)
