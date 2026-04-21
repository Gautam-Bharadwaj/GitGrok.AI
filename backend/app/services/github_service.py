"""
services/github_service.py — Clones GitHub repositories using shallow clones,
manages local source file listing, and handles cleanup.
"""

import asyncio
import logging
import os
import shutil
import urllib.parse
from pathlib import Path

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

class GithubServiceError(Exception):
    """Raised when repo cloning fails."""
    pass

def _build_clone_url(url: str, access_token: str) -> str:
    if access_token and url.startswith("https://"):
        parsed = urllib.parse.urlparse(url)
        authed = parsed._replace(netloc=f"{access_token}@{parsed.netloc}")
        return urllib.parse.urlunparse(authed)
    return url

def _extract_repo_name(url: str) -> str:
    path = urllib.parse.urlparse(url).path.rstrip("/")
    return path.split("/")[-1].removesuffix(".git") or "repository"

def clone_repo(url: str, repo_id: str, access_token: str = "") -> str:
    """
    Synchronous-like wrapper for repo cloning.
    Returns the absolute path to the clone directory.
    """
    clone_dir = Path(settings.temp_clone_dir) / repo_id
    clone_dir.parent.mkdir(parents=True, exist_ok=True)
    if clone_dir.exists():
        shutil.rmtree(clone_dir)

    clone_url = _build_clone_url(url, access_token)
    repo_name = _extract_repo_name(url)

    logger.info("[%s] Cloning %s...", repo_id, repo_name)
    
    import subprocess
    cmd = ["git", "clone", "--depth=1", "--single-branch", "--no-tags", clone_url, str(clone_dir)]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        logger.error("[%s] Clone failed: %s", repo_id, result.stderr)
        raise GithubServiceError(f"git clone failed: {result.stderr[:200]}")

    return str(clone_dir)

def list_source_files(clone_dir: str) -> list[str]:
    """
    Recursively list all source files in the repository.
    """
    exclude_dirs = {".git", "node_modules", "vendor", "__pycache__", ".venv", "dist", "build"}
    exclude_exts = {".jpg", ".png", ".gif", ".pdf", ".exe", ".bin", ".pyc", ".map", ".ico"}
    
    files = []
    base_path = Path(clone_dir)
    for root, dirs, filenames in os.walk(base_path):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        for f in filenames:
            ext = Path(f).suffix.lower()
            if ext not in exclude_exts:
                files.append(str(Path(root) / f))
    return files

def cleanup_clone(repo_id: str) -> None:
    clone_dir = Path(settings.temp_clone_dir) / repo_id
    if clone_dir.exists():
        shutil.rmtree(clone_dir, ignore_errors=True)
        logger.info("[%s] Cleaned up clone dir", repo_id)
