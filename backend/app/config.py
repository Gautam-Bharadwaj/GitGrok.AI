"""
config.py — Application configuration using Pydantic BaseSettings.

All values are read from environment variables or .env file.
No hardcoded secrets — production-safe by design.
"""

from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central settings class.  Loaded once and cached via get_settings()."""

    model_config = SettingsConfigDict(
        env_file=[".env", "../.env"],
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── LLM Providers ────────────────────────────────────────────────────────
    llm_provider: str = Field("openai", description="LLM provider: openai | groq | ollama")

    openai_api_key: str = Field(..., description="OpenAI API key (required for RAM-efficient embeddings)")
    openai_model: str = Field("gpt-4o-mini", description="OpenAI chat model")

    groq_api_key: str = Field("", description="Groq API key")
    groq_model: str = Field("llama-3.3-70b-versatile", description="Groq chat model")

    ollama_base_url: str = Field("http://localhost:11434", description="Ollama API URL")
    ollama_model: str = Field("llama3", description="Ollama local model")

    embedding_model: str = Field(
        "text-embedding-3-small", description="OpenAI embedding model"
    )
    embedding_batch_size: int = Field(200, description="Batch size for embedding requests")
    embedding_batch_delay_ms: int = Field(0, description="Delay between embedding batches in milliseconds")
    ingestion_max_files: int = Field(3000, description="Maximum files to process during ingestion")
    max_context_tokens: int = Field(4000, description="Token budget for LLM context")
    top_k_retrieval: int = Field(5, description="Number of chunks to retrieve")

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
    ingestion_mode: str = Field(
        "inline",
        description="Repository ingestion mode: inline | celery",
    )

    # ── FAISS ────────────────────────────────────────────────────────────────
    faiss_index_dir: str = Field("./data/faiss", description="Root dir for FAISS indexes")
    faiss_index_type: str = Field("IndexFlatIP", description="FAISS index factory string")

    # ── App ───────────────────────────────────────────────────────────────────
    secret_key: str = Field(..., description="App secret key")
    cors_origins: list[str] = Field(
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
    def parse_cors_origins(cls, v: object) -> list[str]:
        """Allow CORS_ORIGINS to be a comma-separated string or a JSON list."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v  # type: ignore[return-value]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached singleton Settings instance."""
    return Settings()  # type: ignore[call-arg]
