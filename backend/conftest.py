"""
conftest.py — Shared pytest fixtures and test-database setup.

Runs before any test file is imported.  Sets the required environment
variables so that Settings() can be constructed without a real .env file.
"""

import os
import sys

# ── Ensure the backend package is importable ──────────────────────────────────
# When running pytest from backend/, the app package must be on sys.path.
sys.path.insert(0, os.path.dirname(__file__))

# ── Provide stub environment variables before any module loads config ─────────
os.environ.setdefault("OPENAI_API_KEY", "sk-test-00000000000000000000000000000000")
os.environ.setdefault("SECRET_KEY", "test-secret-key-not-for-production")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("FAISS_INDEX_DIR", "/tmp/test_faiss")
os.environ.setdefault("TEMP_CLONE_DIR", "/tmp/test_repos")
os.environ.setdefault("DEBUG", "true")
os.environ.setdefault("LOG_LEVEL", "WARNING")  # suppress noisy logs in tests
