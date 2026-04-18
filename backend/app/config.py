"""
config.py — Application configuration using Pydantic BaseSettings.

All values are read from environment variables or .env file.
No hardcoded secrets — production-safe by design.
"""

from functools import lru_cache
from typing import List

from pydantic import AnyHttpUrl, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central settings class.  Loaded once and cached via get_settings()."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── LLM ──────────────────────────────────────────────────────────────────
    openai_api_key: str = Field(..., description="OpenAI API key")
    openai_model: str = Field("gpt-4o-mini", description="OpenAI chat model")
    embedding_model: str = Field(
        "text-embedding-3-small", description="OpenAI embedding model"
    )
    max_context_tokens: int = Field(6000, description="Token budget for LLM context")
    top_k_retrieval: int = Field(8, description="Number of chunks to retrieve")

    # ── GitHub ────────────────────────────────────────────────────────────────
    github_access_token: str = Field(
        "", description="GitHub PAT for private repos (optional)"
    )
    temp_clone_dir: str = Field("./tmp/repos", description="Directory for shallow clones")
    max_repo_size_mb: int = Field(500, description="Max allowed repo size in MB")

    # ── Database ──────────────────────────────────────────────────────────────
    database_url: str = Field(
        "sqlite+aiosqlite:///./data/app.db", description="SQLAlchemy async DB URL"
    )
    redis_url: str = Field("redis://localhost:6379/0", description="Redis connection URL")

    # ── FAISS ────────────────────────────────────────────────────────────────
    faiss_index_dir: str = Field("./data/faiss", description="Root dir for FAISS indexes")
    faiss_index_type: str = Field("IndexFlatIP", description="FAISS index factory string")

    # ── App ───────────────────────────────────────────────────────────────────
    secret_key: str = Field(..., description="App secret key")
    cors_origins: List[str] = Field(
        default=["http://localhost:3000"],
        description="Allowed CORS origins",
    )
    debug: bool = Field(False, description="Enable debug mode")
    log_level: str = Field("INFO", description="Logging level")

    # ── Frontend (informational — used in OpenAPI docs) ───────────────────────
    next_public_api_url: str = Field(
        "http://localhost:8000", description="Public API base URL"
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: object) -> List[str]:
        """Allow CORS_ORIGINS to be a comma-separated string or a JSON list."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v  # type: ignore[return-value]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached singleton Settings instance."""
    return Settings()  # type: ignore[call-arg]
