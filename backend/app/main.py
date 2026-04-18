"""
main.py — FastAPI application entry-point.

Wires together:
- All routers
- CORS middleware
- Structured JSON logging
- DB initialisation on startup
- Global exception handlers
- OpenAPI documentation
"""

import logging
import sys
import time
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.database import init_db
from app.routes import analysis, chat, repo

settings = get_settings()

# ── Logging ───────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=settings.log_level.upper(),
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    stream=sys.stdout,
)
structlog.configure(
    wrapper_class=structlog.make_filtering_bound_logger(
        logging.getLevelName(settings.log_level.upper())
    ),
)
logger = logging.getLogger(__name__)


# ── Lifespan ───────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: create DB tables.  Shutdown: no-op (connections auto-closed)."""
    logger.info("Starting RAG Code Assistant API…")
    await init_db()
    logger.info("Database initialised.")
    yield
    logger.info("Server shutting down.")


# ── App factory ───────────────────────────────────────────────────────────────

app = FastAPI(
    title="RAG Code Intelligence Assistant",
    description=(
        "Production-grade RAG system that indexes any GitHub repository "
        "and answers developer questions with cited, context-aware responses."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Request timing middleware ─────────────────────────────────────────────────

@app.middleware("http")
async def add_timing_header(request: Request, call_next):
    """Inject X-Process-Time header in every response for observability."""
    start = time.perf_counter()
    response = await call_next(request)
    elapsed = time.perf_counter() - start
    response.headers["X-Process-Time"] = f"{elapsed:.4f}s"
    return response


# ── Global exception handlers ─────────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception: %s", exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred.", "type": type(exc).__name__},
    )


# ── Routers ───────────────────────────────────────────────────────────────────

app.include_router(repo.router)
app.include_router(chat.router)
app.include_router(analysis.router)


# ── Health check ──────────────────────────────────────────────────────────────

@app.get("/health", tags=["Health"])
async def health_check() -> dict:
    """Lightweight health check for Docker / load-balancer probes."""
    return {"status": "ok", "service": "rag-code-assistant"}


@app.get("/", tags=["Root"])
async def root() -> dict:
    return {
        "service": "RAG Code Intelligence Assistant",
        "version": "1.0.0",
        "docs": "/docs",
    }
