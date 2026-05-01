"""
Backend entrypoint for running directly without Docker.

Usage:
    python run.py             # production-like
    python run.py --reload    # with hot-reload (dev)
"""

import argparse

import uvicorn

from app.config import get_settings

settings = get_settings()


def main() -> None:
    parser = argparse.ArgumentParser(description="RepoMind API server")
    parser.add_argument("--reload", action="store_true", help="Enable hot-reload (dev only)")
    parser.add_argument("--host", default="0.0.0.0", help="Bind host")
    parser.add_argument("--port", type=int, default=8000, help="Bind port")
    parser.add_argument("--workers", type=int, default=1, help="Number of worker processes")
    args = parser.parse_args()

    workers = args.workers if not args.reload else 1  # reload is incompatible with workers>1

    uvicorn.run(
        "app.main:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
        workers=workers,
        log_level=settings.log_level.lower(),
        access_log=settings.debug,
    )


if __name__ == "__main__":
    main()
