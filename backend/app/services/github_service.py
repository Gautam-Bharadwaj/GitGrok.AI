"""
services/github_service.py — Clones GitHub repositories using shallow clones,
manages local source file listing, and handles cleanup.
"""

import logging
import shutil
import urllib.parse
from pathlib import Path

from app.config import get_settings
from app.utils.file_filter import collect_source_files

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
    base_path = Path(clone_dir)
    files = [str(p) for p in collect_source_files(base_path)]
    if len(files) > settings.ingestion_max_files:
        logger.warning(
            "Large repository detected (%d files). Truncating to first %d files for faster ingestion.",
            len(files),
            settings.ingestion_max_files,
        )
        return files[: settings.ingestion_max_files]
    return files

def cleanup_clone(repo_id: str) -> None:
    clone_dir = Path(settings.temp_clone_dir) / repo_id
    if clone_dir.exists():
        shutil.rmtree(clone_dir, ignore_errors=True)
        logger.info("[%s] Cleaned up clone dir", repo_id)
