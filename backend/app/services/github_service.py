"""
services/github_service.py — Clones GitHub repositories using shallow clones,
streams progress events via an async generator, and manages cleanup.
"""

import asyncio
import logging
import os
import shutil
import urllib.parse
from pathlib import Path
from typing import AsyncGenerator

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class GithubServiceError(Exception):
    """Raised when repo cloning fails."""
    pass


def _build_clone_url(url: str, access_token: str) -> str:
    """
    Inject a PAT into the HTTPS URL so git can clone private repos.
    SSH URLs are returned unchanged (key-based auth assumed).
    """
    if access_token and url.startswith("https://"):
        parsed = urllib.parse.urlparse(url)
        authed = parsed._replace(
            netloc=f"{access_token}@{parsed.netloc}"
        )
        return urllib.parse.urlunparse(authed)
    return url


def _extract_repo_name(url: str) -> str:
    """Derive a human-readable repo name from a GitHub URL."""
    path = urllib.parse.urlparse(url).path.rstrip("/")
    return path.split("/")[-1].removesuffix(".git") or "repository"


async def clone_repository(
    repo_id: str,
    url: str,
    access_token: str = "",
) -> AsyncGenerator[dict, None]:
    """
    Shallow-clone a GitHub repository and yield SSE-style progress dicts.

    Yields:
        {"event": str, "data": dict}  — consumed by the ingestion worker.

    Raises:
        GithubServiceError: if git exits with a non-zero return code.
    """
    clone_dir = Path(settings.temp_clone_dir) / repo_id
    clone_dir.parent.mkdir(parents=True, exist_ok=True)

    if clone_dir.exists():
        shutil.rmtree(clone_dir)

    clone_url = _build_clone_url(url, access_token)
    repo_name = _extract_repo_name(url)

    yield {"event": "status", "data": {"message": f"Cloning {repo_name}…", "percent": 5}}

    cmd = [
        "git", "clone",
        "--depth=1",
        "--single-branch",
        "--no-tags",
        clone_url,
        str(clone_dir),
    ]

    logger.info("Starting shallow clone: %s → %s", url, clone_dir)
    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )

    _, stderr_bytes = await process.communicate()

    if process.returncode != 0:
        error_msg = stderr_bytes.decode(errors="replace")
        logger.error("Clone failed (exit %d): %s", process.returncode, error_msg)
        raise GithubServiceError(f"git clone failed: {error_msg[:500]}")

    # Sanity-check repo size
    total_mb = sum(
        f.stat().st_size for f in clone_dir.rglob("*") if f.is_file()
    ) / (1024 * 1024)

    if total_mb > settings.max_repo_size_mb:
        shutil.rmtree(clone_dir, ignore_errors=True)
        raise GithubServiceError(
            f"Repository is {total_mb:.1f} MB, exceeding limit of {settings.max_repo_size_mb} MB."
        )

    logger.info("Clone complete. Size: %.1f MB", total_mb)
    yield {
        "event": "clone_complete",
        "data": {
            "repo_name": repo_name,
            "clone_dir": str(clone_dir),
            "size_mb": round(total_mb, 2),
            "percent": 20,
        },
    }


def get_clone_dir(repo_id: str) -> Path:
    """Return the expected clone directory for a given repo_id."""
    return Path(settings.temp_clone_dir) / repo_id


def cleanup_clone(repo_id: str) -> None:
    """Remove the temporary clone directory for a repo."""
    clone_dir = get_clone_dir(repo_id)
    if clone_dir.exists():
        shutil.rmtree(clone_dir, ignore_errors=True)
        logger.info("Cleaned up clone dir: %s", clone_dir)
