"""
routes/chat.py — Chat endpoints with streaming support.

POST /api/v1/chat/ask              — Ask a question (streaming or JSON)
GET  /api/v1/chat/history/{sid}   — Retrieve message history for a session
"""

import json
import logging
import uuid
from typing import AsyncGenerator, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.chat import ChatMessage, ChatSession
from app.models.repo import Repository, RepoStatus
from app.services.cache_service import get_cached_answer, set_cached_answer
from app.services.llm_service import answer_question

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/chat", tags=["Chat"])


# ── Schemas ────────────────────────────────────────────────────────────────────

class AskRequest(BaseModel):
    repo_id: str = Field(..., description="Target repository UUID")
    session_id: Optional[str] = Field(None, description="Existing session UUID or None to create")
    question: str = Field(..., min_length=3, max_length=2000)
    stream: bool = Field(True, description="Stream token-by-token via SSE")


class MessageOut(BaseModel):
    id: str
    role: str
    content: str
    sources: Optional[list[dict]]
    tokens_used: Optional[int]
    created_at: str


class HistoryResponse(BaseModel):
    session_id: str
    repo_id: str
    messages: list[MessageOut]


# ── Helpers ────────────────────────────────────────────────────────────────────

async def _get_or_create_session(
    repo_id: str, session_id: Optional[str], db: AsyncSession
) -> ChatSession:
    """Fetch an existing session or create a new one for the repo."""
    if session_id:
        row = await db.get(ChatSession, session_id)
        if row and row.repo_id == repo_id:
            return row

    new_session = ChatSession(
        id=str(uuid.uuid4()),
        repo_id=repo_id,
    )
    db.add(new_session)
    await db.flush()
    return new_session


async def _persist_messages(
    session_id: str,
    question: str,
    answer: str,
    sources: list[dict],
    tokens_used: Optional[int],
    db: AsyncSession,
) -> None:
    """Write the user question and assistant answer to the DB."""
    db.add(ChatMessage(
        id=str(uuid.uuid4()),
        session_id=session_id,
        role="user",
        content=question,
    ))
    db.add(ChatMessage(
        id=str(uuid.uuid4()),
        session_id=session_id,
        role="assistant",
        content=answer,
        sources=json.dumps(sources),
        tokens_used=tokens_used,
    ))
    await db.flush()


async def _sse_stream(
    gen: AsyncGenerator[str, None],
    sources: list[dict],
    session_id: str,
    question: str,
    db: AsyncSession,
) -> AsyncGenerator[bytes, None]:
    """
    Wrap the LLM token generator in SSE format.

    Protocol:
        data: {"type": "token", "content": "..."}\\n\\n
        data: {"type": "sources", "sources": [...]}\\n\\n
        data: {"type": "done", "session_id": "..."}\\n\\n
    """
    full_answer = ""
    try:
        # Stream sources first so the UI can show them immediately
        yield f"data: {json.dumps({'type': 'sources', 'sources': sources})}\n\n".encode()

        async for token in gen:
            full_answer += token
            payload = json.dumps({"type": "token", "content": token})
            yield f"data: {payload}\n\n".encode()

    except Exception as exc:  # noqa: BLE001
        logger.error("SSE stream error: %s", exc)
        yield f"data: {json.dumps({'type': 'error', 'message': str(exc)})}\n\n".encode()
    finally:
        # Persist regardless of client disconnect
        await _persist_messages(session_id, question, full_answer, sources, None, db)
        await db.commit()
        yield f"data: {json.dumps({'type': 'done', 'session_id': session_id})}\n\n".encode()


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post("/ask")
async def ask(
    body: AskRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Submit a developer question to the RAG pipeline.

    - If `stream=true` (default): returns an SSE stream.
    - If `stream=false`: returns a JSON response with the full answer.

    Checks the Redis query cache first.  On cache miss, runs the full RAG pipeline.
    """
    # Verify repo is indexed
    repo = await db.get(Repository, body.repo_id)
    if repo is None:
        raise HTTPException(status_code=404, detail="Repository not found.")
    if repo.status != RepoStatus.INDEXED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Repository is not yet indexed (status: {repo.status}).",
        )

    session = await _get_or_create_session(body.repo_id, body.session_id, db)

    # L1 cache check (only for non-streaming — streaming answers are ephemeral)
    if not body.stream:
        cached = await get_cached_answer(body.repo_id, body.question)
        if cached:
            return cached

    result = await answer_question(
        query=body.question,
        repo_id=body.repo_id,
        repo_name=repo.name,
        stream=body.stream,
    )

    if body.stream:
        return StreamingResponse(
            _sse_stream(
                result["stream_gen"],
                result["sources"],
                session.id,
                body.question,
                db,
            ),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Session-Id": session.id,
            },
        )

    # Non-streaming path
    answer = result["answer"]
    sources = result["sources"]
    tokens_used = result["tokens_used"]

    await _persist_messages(session.id, body.question, answer, sources, tokens_used, db)

    response_body = {
        "session_id": session.id,
        "answer": answer,
        "sources": sources,
        "tokens_used": tokens_used,
    }
    await set_cached_answer(body.repo_id, body.question, response_body)
    return response_body


@router.get("/history/{session_id}", response_model=HistoryResponse)
async def get_history(
    session_id: str,
    db: AsyncSession = Depends(get_db),
) -> HistoryResponse:
    """Return the full message history for a chat session."""
    session = await db.get(ChatSession, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found.")

    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
    )
    messages = result.scalars().all()

    return HistoryResponse(
        session_id=session.id,
        repo_id=session.repo_id,
        messages=[
            MessageOut(
                id=m.id,
                role=m.role,
                content=m.content,
                sources=json.loads(m.sources) if m.sources else None,
                tokens_used=m.tokens_used,
                created_at=m.created_at.isoformat(),
            )
            for m in messages
        ],
    )
