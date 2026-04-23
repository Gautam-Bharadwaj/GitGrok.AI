"""tests/test_retrieval.py — Tests for the retrieval pipeline."""

import pickle
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import faiss
import numpy as np
import pytest

from app.services.retrieval_service import _mmr, build_context, retrieve


REPO_ID = "test-repo-ret-001"
DIM = 1536


# ── Helpers ────────────────────────────────────────────────────────────────────

def _make_random_vec() -> np.ndarray:
    v = np.random.randn(DIM).astype(np.float32)
    faiss.normalize_L2(v.reshape(1, -1))
    return v.flatten()


def _make_metadata(n: int) -> list[dict]:
    return [
        {
            "chunk_id": f"chunk-{i}",
            "repo_id": REPO_ID,
            "file_path": f"src/module_{i % 3}.py",
            "language": "python",
            "chunk_type": "function",
            "name": f"function_{i}",
            "content": f"def function_{i}():\n    return {i}",
            "start_line": i * 10 + 1,
            "end_line": i * 10 + 5,
            "token_count": 20,
        }
        for i in range(n)
    ]


# ── MMR tests ─────────────────────────────────────────────────────────────────

class TestMMR:
    def test_returns_top_k(self):
        n, k = 20, 5
        query_vec = _make_random_vec().reshape(1, -1)
        candidate_vecs = np.vstack([_make_random_vec() for _ in range(n)])
        meta = _make_metadata(n)
        result = _mmr(query_vec, candidate_vecs, meta, top_k=k)
        assert len(result) == k

    def test_no_duplicates(self):
        n, k = 10, 5
        query_vec = _make_random_vec().reshape(1, -1)
        candidate_vecs = np.vstack([_make_random_vec() for _ in range(n)])
        meta = _make_metadata(n)
        result = _mmr(query_vec, candidate_vecs, meta, top_k=k)
        ids = [r["chunk_id"] for r in result]
        assert len(ids) == len(set(ids)), "MMR must not return duplicate chunks"

    def test_fewer_candidates_than_k(self):
        n, k = 3, 10
        query_vec = _make_random_vec().reshape(1, -1)
        candidate_vecs = np.vstack([_make_random_vec() for _ in range(n)])
        meta = _make_metadata(n)
        result = _mmr(query_vec, candidate_vecs, meta, top_k=k)
        assert len(result) == n, "Should return all candidates when n < k"


# ── Context builder tests ─────────────────────────────────────────────────────

class TestBuildContext:
    def test_respects_token_budget(self):
        """Context must not exceed max_tokens."""
        chunks = _make_metadata(50)
        context = build_context(chunks, max_tokens=500)
        # Rough check: well under 500 * 4 chars
        assert len(context) < 500 * 6, "Context exceeds rough token budget"

    def test_includes_file_paths(self):
        chunks = _make_metadata(3)
        context = build_context(chunks, max_tokens=4000)
        for chunk in chunks[:3]:
            assert chunk["file_path"] in context

    def test_empty_chunks_returns_empty_string(self):
        assert build_context([], max_tokens=4000) == ""


# ── Retrieve integration test (mocked FAISS + OpenAI) ────────────────────────

class TestRetrieve:
    @pytest.mark.asyncio
    async def test_retrieve_returns_list(self, tmp_path: Path, monkeypatch):
        """Full retrieve() call with mocked FAISS index and embedding API."""
        n = 10
        meta = _make_metadata(n)

        # Build a real FAISS index in a temp directory
        matrix = np.vstack([_make_random_vec() for _ in range(n)])
        faiss.normalize_L2(matrix)
        index = faiss.IndexFlatIP(DIM)
        index.add(matrix)

        idx_dir = tmp_path / REPO_ID
        idx_dir.mkdir()
        faiss.write_index(index, str(idx_dir / "index.faiss"))
        with open(idx_dir / "metadata.pkl", "wb") as f:
            pickle.dump(meta, f)

        # Patch the index directory
        monkeypatch.setattr(
            "app.services.embedding_service.settings.faiss_index_dir", str(tmp_path)
        )
        monkeypatch.setattr(
            "app.services.retrieval_service.settings.faiss_index_dir", str(tmp_path)
        )

        # Mock the OpenAI embedding call
        fake_vec = _make_random_vec().tolist()
        mock_response = MagicMock()
        mock_response.data = [MagicMock(embedding=fake_vec)]

        with patch("app.services.embedding_service._get_client") as mock_client_factory:
            mock_client = AsyncMock()
            mock_client.embeddings.create = AsyncMock(return_value=mock_response)
            mock_client_factory.return_value = mock_client

            results = await retrieve("how does function_0 work", REPO_ID, top_k=3)

        assert isinstance(results, list)
        assert len(results) <= 3
        assert all("file_path" in r for r in results)
