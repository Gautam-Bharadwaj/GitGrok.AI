"""tests/test_api.py — Integration tests for all FastAPI endpoints."""

import json
import pickle
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import faiss
import numpy as np
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database import Base, get_db
from app.main import app
from app.models.repo import Repository, RepoStatus

# ── Test DB setup ──────────────────────────────────────────────────────────────

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(TEST_DB_URL, echo=False)
TestSessionLocal = async_sessionmaker(
    bind=test_engine, class_=AsyncSession, expire_on_commit=False
)


async def override_get_db():
    async with TestSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture()
async def client():
    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest_asyncio.fixture()
async def indexed_repo():
    """Insert a fake INDEXED repository row."""
    async with TestSessionLocal() as session:
        repo = Repository(
            id="test-repo-indexed",
            name="test-project",
            url="https://github.com/test/test-project",
            status=RepoStatus.INDEXED,
            progress_percent=100,
            file_count=10,
            chunk_count=50,
        )
        session.add(repo)
        await session.commit()
    return repo


# ── Health check ───────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_health(client: AsyncClient):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


# ── Repo endpoints ─────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_load_repo_enqueues_task(client: AsyncClient):
    with patch("app.routes.repo.ingest_repository") as mock_task:
        mock_task.apply_async = MagicMock()
        response = await client.post(
            "/api/v1/repo/load",
            json={"url": "https://github.com/owner/my-repo"},
        )
    assert response.status_code == 202
    data = response.json()
    assert "repo_id" in data
    assert data["status"] == "PENDING"


@pytest.mark.asyncio
async def test_load_repo_invalid_url(client: AsyncClient):
    response = await client.post(
        "/api/v1/repo/load",
        json={"url": "ftp://invalid-url"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_repo_status(client: AsyncClient, indexed_repo):
    response = await client.get(f"/api/v1/repo/status/{indexed_repo.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "INDEXED"
    assert data["progress_percent"] == 100
    assert data["file_count"] == 10


@pytest.mark.asyncio
async def test_repo_status_not_found(client: AsyncClient):
    response = await client.get("/api/v1/repo/status/nonexistent-id")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_list_repos(client: AsyncClient, indexed_repo):
    response = await client.get("/api/v1/repo/list")
    assert response.status_code == 200
    repos = response.json()
    assert any(r["repo_id"] == indexed_repo.id for r in repos)


@pytest.mark.asyncio
async def test_delete_repo(client: AsyncClient, indexed_repo):
    with (
        patch("app.routes.repo.delete_index") as mock_del_idx,
        patch("app.routes.repo.invalidate_repo_cache", new_callable=AsyncMock),
    ):
        mock_del_idx.return_value = None
        response = await client.delete(f"/api/v1/repo/{indexed_repo.id}")
    assert response.status_code == 204

    # Verify gone
    status_resp = await client.get(f"/api/v1/repo/status/{indexed_repo.id}")
    assert status_resp.status_code == 404


# ── Chat endpoints ─────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_ask_not_indexed(client: AsyncClient):
    """Asking against a PENDING repo should return 409."""
    async with TestSessionLocal() as session:
        repo = Repository(
            id="pending-repo",
            name="pending",
            url="https://github.com/x/y",
            status=RepoStatus.PENDING,
        )
        session.add(repo)
        await session.commit()

    response = await client.post(
        "/api/v1/chat/ask",
        json={"repo_id": "pending-repo", "question": "Hello", "stream": False},
    )
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_ask_non_streaming(client: AsyncClient, indexed_repo):
    """Non-streaming ask with mocked cache and LLM."""
    with (
        patch("app.routes.chat.get_cached_answer", new_callable=AsyncMock, return_value=None),
        patch("app.routes.chat.set_cached_answer", new_callable=AsyncMock),
        patch(
            "app.routes.chat.answer_question",
            new_callable=AsyncMock,
            return_value={
                "stream_gen": None,
                "answer": "The code does X.",
                "sources": [{"file_path": "src/main.py", "start_line": 1, "end_line": 10}],
                "tokens_used": 150,
            },
        ),
    ):
        response = await client.post(
            "/api/v1/chat/ask",
            json={
                "repo_id": indexed_repo.id,
                "question": "What does main.py do?",
                "stream": False,
            },
        )
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert data["answer"] == "The code does X."
    assert "sources" in data


@pytest.mark.asyncio
async def test_chat_history_empty(client: AsyncClient, indexed_repo):
    # Create a session
    from app.models.chat import ChatSession
    async with TestSessionLocal() as session:
        cs = ChatSession(id="test-session-001", repo_id=indexed_repo.id)
        session.add(cs)
        await session.commit()

    response = await client.get("/api/v1/chat/history/test-session-001")
    assert response.status_code == 200
    data = response.json()
    assert data["session_id"] == "test-session-001"
    assert data["messages"] == []
