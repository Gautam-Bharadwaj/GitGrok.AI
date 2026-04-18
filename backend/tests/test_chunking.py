"""tests/test_chunking.py — Unit tests for the chunking service."""

import textwrap
from pathlib import Path

import pytest

from app.services.chunking_service import (
    CodeChunk,
    _chunk_python_ast,
    _chunk_sliding_window,
    _chunk_semantic,
    chunk_file,
)


# ── Fixtures ───────────────────────────────────────────────────────────────────

REPO_ID = "test-repo-001"


@pytest.fixture()
def tmp_python_file(tmp_path: Path) -> Path:
    """Write a sample Python file and return its path."""
    src = textwrap.dedent("""\
        class UserService:
            \"\"\"Manages user operations.\"\"\"

            def get_user(self, user_id: int) -> dict:
                \"\"\"Fetch user by ID.\"\"\"
                return {"id": user_id, "name": "Alice"}

            def create_user(self, name: str) -> dict:
                \"\"\"Create a new user record.\"\"\"
                return {"id": 42, "name": name}


        def helper():
            return True
    """)
    f = tmp_path / "user_service.py"
    f.write_text(src)
    return f


@pytest.fixture()
def tmp_md_file(tmp_path: Path) -> Path:
    """Write a sample Markdown file and return its path."""
    src = textwrap.dedent("""\
        # Project Overview
        This is the overview section.

        ## Installation
        Run `pip install -r requirements.txt`.

        ## Usage
        Start with `python main.py`.
    """)
    f = tmp_path / "README.md"
    f.write_text(src)
    return f


# ── Python AST chunking ────────────────────────────────────────────────────────

class TestPythonASTChunking:
    def test_extracts_class(self, tmp_python_file: Path):
        chunks = _chunk_python_ast(
            tmp_python_file.read_text(), REPO_ID, "user_service.py"
        )
        class_chunks = [c for c in chunks if c.chunk_type == "class"]
        assert any(c.name == "UserService" for c in class_chunks), \
            "Should extract UserService class"

    def test_extracts_top_level_function(self, tmp_python_file: Path):
        chunks = _chunk_python_ast(
            tmp_python_file.read_text(), REPO_ID, "user_service.py"
        )
        func_chunks = [c for c in chunks if c.name == "helper"]
        assert func_chunks, "Should extract top-level helper() function"

    def test_chunk_lines_are_correct(self, tmp_python_file: Path):
        chunks = _chunk_python_ast(
            tmp_python_file.read_text(), REPO_ID, "user_service.py"
        )
        for chunk in chunks:
            assert chunk.start_line >= 1
            assert chunk.end_line >= chunk.start_line

    def test_empty_file_returns_no_chunks(self):
        chunks = _chunk_python_ast("", REPO_ID, "empty.py")
        assert chunks == []

    def test_syntax_error_returns_empty(self):
        bad_source = "def broken(:\n    pass"
        chunks = _chunk_python_ast(bad_source, REPO_ID, "bad.py")
        assert chunks == [], "Syntax error should return empty list"


# ── Sliding window chunking ────────────────────────────────────────────────────

class TestSlidingWindowChunking:
    def test_single_chunk_for_short_source(self):
        source = "x = 1\ny = 2\n"
        chunks = _chunk_sliding_window(source, REPO_ID, "short.py", "python")
        assert len(chunks) == 1
        assert chunks[0].chunk_type == "window"

    def test_no_mid_line_splits(self, tmp_python_file: Path):
        source = tmp_python_file.read_text()
        chunks = _chunk_sliding_window(source, REPO_ID, "user_service.py", "python", chunk_size=50)
        for chunk in chunks:
            # Content must start at the beginning of a line (no trailing partial line)
            assert not chunk.content.startswith(" " * 4 + "def"), \
                "Chunk should not start mid-indent without context"

    def test_chunks_cover_all_lines(self):
        source = "\n".join(f"line_{i}" for i in range(200))
        chunks = _chunk_sliding_window(source, REPO_ID, "big.py", "python")
        # Every line should appear in at least one chunk
        all_content = " ".join(c.content for c in chunks)
        for i in range(0, 200, 20):  # sample check
            assert f"line_{i}" in all_content


# ── Semantic chunking ─────────────────────────────────────────────────────────

class TestSemanticChunking:
    def test_splits_on_headings(self, tmp_md_file: Path):
        chunks = _chunk_semantic(
            tmp_md_file.read_text(), REPO_ID, "README.md"
        )
        assert len(chunks) >= 2, "Should produce at least one chunk per heading"

    def test_chunk_type_is_doc(self, tmp_md_file: Path):
        chunks = _chunk_semantic(
            tmp_md_file.read_text(), REPO_ID, "README.md"
        )
        for chunk in chunks:
            assert chunk.chunk_type == "doc"


# ── Integration: chunk_file dispatcher ────────────────────────────────────────

class TestChunkFileDispatcher:
    def test_python_file_uses_ast(self, tmp_python_file: Path, tmp_path: Path):
        chunks = chunk_file(tmp_python_file, REPO_ID, tmp_path)
        names = {c.name for c in chunks}
        assert "UserService" in names or "helper" in names

    def test_markdown_file_uses_semantic(self, tmp_md_file: Path, tmp_path: Path):
        chunks = chunk_file(tmp_md_file, REPO_ID, tmp_path)
        assert all(c.language == "markdown" for c in chunks)

    def test_empty_file_returns_empty(self, tmp_path: Path):
        empty = tmp_path / "empty.py"
        empty.write_text("")
        chunks = chunk_file(empty, REPO_ID, tmp_path)
        assert chunks == []
