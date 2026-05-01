"""
routes/analysis.py — Advanced analysis endpoints.

POST /api/v1/analysis/bugs     — Security & logic bug scan
POST /api/v1/analysis/readme   — Auto-generate README
GET  /api/v1/analysis/stats/{repo_id}  — Repo statistics dashboard
GET  /api/v1/analysis/files/{repo_id}  — File tree for indexed repo
"""

import logging
import pickle
import re
from collections import Counter
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models.repo import Repository, RepoStatus
from app.services.llm_service import get_answer, handle_bug_detection, handle_readme_generation
from app.services.retrieval_service import retrieve

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/analysis", tags=["Analysis"])
settings = get_settings()


# ── Schemas ────────────────────────────────────────────────────────────────────

class BugsRequest(BaseModel):
    repo_id: str
    file_path: str | None = Field(None, description="Limit scan to a specific file")


class BugFinding(BaseModel):
    severity: str             # CRITICAL | WARNING | INFO
    file: str
    line_range: str
    description: str
    suggestion: str


class BugsResponse(BaseModel):
    repo_id: str
    findings: list[BugFinding]


class ReadmeRequest(BaseModel):
    repo_id: str


class ReadmeResponse(BaseModel):
    repo_id: str
    markdown: str


class LanguageStat(BaseModel):
    language: str
    count: int
    percentage: float


class ChunkTypeStat(BaseModel):
    chunk_type: str
    count: int


class RepoStats(BaseModel):
    repo_id: str
    name: str
    file_count: int
    chunk_count: int
    total_tokens: int
    languages: list[LanguageStat]
    chunk_types: list[ChunkTypeStat]
    top_files: list[dict]
    avg_chunk_size: float


class FileNode(BaseModel):
    name: str
    path: str
    is_dir: bool
    children: list["FileNode"] = []
    chunk_count: int = 0
    language: str = ""


# ── Helpers ────────────────────────────────────────────────────────────────────

def _parse_bug_findings(raw: str) -> list[BugFinding]:
    """
    Parse the LLM's response into structured BugFinding objects.

    The LLM is prompted to output lines like:
    [SEVERITY] file/path.py:L10-20 — Description | Suggestion: …

    Falls back gracefully if the format deviates.
    """
    findings: list[BugFinding] = []
    severity_pattern = re.compile(r"\b(CRITICAL|WARNING|INFO)\b", re.IGNORECASE)
    file_pattern = re.compile(r"([\w./\\-]+\.\w{1,10})(?::L(\d+(?:-\d+)?))?")

    for line in raw.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue

        sev_match = severity_pattern.search(line)
        severity = sev_match.group(1).upper() if sev_match else "INFO"

        file_match = file_pattern.search(line)
        file_path = file_match.group(1) if file_match else "unknown"
        line_range = file_match.group(2) if file_match and file_match.group(2) else "?"

        # Split description from suggestion on " | Suggestion:" delimiter
        parts = re.split(r"\|\s*[Ss]uggestion\s*:", line, maxsplit=1)
        description = parts[0].strip() if parts else line
        suggestion = parts[1].strip() if len(parts) > 1 else "Review and refactor."

        findings.append(
            BugFinding(
                severity=severity,
                file=file_path,
                line_range=line_range,
                description=description,
                suggestion=suggestion,
            )
        )

    # Sort: CRITICAL first, then WARNING, then INFO
    order = {"CRITICAL": 0, "WARNING": 1, "INFO": 2}
    findings.sort(key=lambda f: order.get(f.severity, 3))
    return findings


def _build_file_tree(file_paths: list[str], chunk_counts: dict[str, int], languages: dict[str, str]) -> list[FileNode]:
    """Build a nested file tree from flat file paths."""
    root: dict = {}

    for fp in sorted(file_paths):
        parts = fp.split("/")
        current = root
        for part in parts:
            if part not in current:
                current[part] = {}
            current = current[part]

    def _build_nodes(tree: dict, prefix: str = "") -> list[FileNode]:
        nodes = []
        for name, children in sorted(tree.items()):
            path = f"{prefix}/{name}" if prefix else name
            if children:  # directory
                child_nodes = _build_nodes(children, path)
                # Check if it's actually a file (leaf with no children in tree)
                total_chunks = sum(n.chunk_count for n in child_nodes)
                nodes.append(FileNode(
                    name=name,
                    path=path,
                    is_dir=True,
                    children=child_nodes,
                    chunk_count=total_chunks,
                ))
            else:  # file
                nodes.append(FileNode(
                    name=name,
                    path=path,
                    is_dir=False,
                    chunk_count=chunk_counts.get(path, 0),
                    language=languages.get(path, ""),
                ))
        # Sort: directories first, then files
        nodes.sort(key=lambda n: (0 if n.is_dir else 1, n.name.lower()))
        return nodes

    return _build_nodes(root)


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post("/bugs", response_model=BugsResponse)
async def scan_bugs(
    body: BugsRequest,
    db: AsyncSession = Depends(get_db),
) -> BugsResponse:
    """
    Perform a security and logic bug scan on a repository.

    Optionally restricts the scan to a single file via *file_path*.
    """
    repo = await db.get(Repository, body.repo_id)
    if repo is None:
        raise HTTPException(status_code=404, detail="Repository not found.")
    if repo.status != RepoStatus.INDEXED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Repository is not yet indexed.",
        )

    query = (
        f"security vulnerabilities and bugs in {body.file_path}"
        if body.file_path
        else "security vulnerabilities, bugs, and logic errors across the codebase"
    )

    chunks = await retrieve(query, body.repo_id, top_k=12)
    if body.file_path:
        chunks = [c for c in chunks if body.file_path in c.get("file_path", "")] or chunks

    messages = await handle_bug_detection(body.repo_id, repo.name, chunks)
    raw_answer, _ = await get_answer(messages)

    findings = _parse_bug_findings(raw_answer)
    return BugsResponse(repo_id=body.repo_id, findings=findings)


@router.post("/readme", response_model=ReadmeResponse)
async def generate_readme(
    body: ReadmeRequest,
    db: AsyncSession = Depends(get_db),
) -> ReadmeResponse:
    """
    Auto-generate a professional README.md for the repository.

    Retrieves a broad cross-section of the codebase (entry points, config files,
    key modules) to give the LLM comprehensive context.
    """
    repo = await db.get(Repository, body.repo_id)
    if repo is None:
        raise HTTPException(status_code=404, detail="Repository not found.")
    if repo.status != RepoStatus.INDEXED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Repository is not yet indexed.",
        )

    # Use a broad query to get diverse chunks from across the repo
    broad_query = (
        "main entry point README setup installation configuration overview architecture"
    )
    chunks = await retrieve(broad_query, body.repo_id, top_k=16)

    messages = await handle_readme_generation(body.repo_id, repo.name, chunks)
    readme_md, _ = await get_answer(messages)

    return ReadmeResponse(repo_id=body.repo_id, markdown=readme_md)


@router.get("/stats/{repo_id}", response_model=RepoStats)
async def get_repo_stats(
    repo_id: str,
    db: AsyncSession = Depends(get_db),
) -> RepoStats:
    """
    Return detailed statistics about an indexed repository:
    language breakdown, chunk types, top files by chunk count, average chunk size.
    """
    repo = await db.get(Repository, repo_id)
    if repo is None:
        raise HTTPException(status_code=404, detail="Repository not found.")
    if repo.status != RepoStatus.INDEXED:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Repository is not yet indexed.")

    # Load metadata from FAISS pickle
    meta_path = Path(settings.faiss_index_dir) / repo_id / "metadata.pkl"
    if not meta_path.exists():
        raise HTTPException(status_code=404, detail="Index metadata not found.")

    with open(meta_path, "rb") as fh:
        metadata: list[dict] = pickle.load(fh)

    # Language breakdown
    lang_counter = Counter(m.get("language", "unknown") for m in metadata)
    total_chunks = len(metadata)
    languages = [
        LanguageStat(
            language=lang,
            count=count,
            percentage=round(count / total_chunks * 100, 1) if total_chunks else 0,
        )
        for lang, count in lang_counter.most_common(15)
    ]

    # Chunk type breakdown
    type_counter = Counter(m.get("chunk_type", "unknown") for m in metadata)
    chunk_types = [
        ChunkTypeStat(chunk_type=ct, count=count)
        for ct, count in type_counter.most_common()
    ]

    # Top files by chunk count
    file_counter = Counter(m.get("file_path", "unknown") for m in metadata)
    top_files = [
        {"file_path": fp, "chunk_count": count}
        for fp, count in file_counter.most_common(10)
    ]

    # Total tokens and average chunk size
    total_tokens = sum(m.get("token_count", 0) for m in metadata)
    avg_chunk_size = round(total_tokens / total_chunks, 1) if total_chunks else 0

    return RepoStats(
        repo_id=repo_id,
        name=repo.name,
        file_count=repo.file_count,
        chunk_count=total_chunks,
        total_tokens=total_tokens,
        languages=languages,
        chunk_types=chunk_types,
        top_files=top_files,
        avg_chunk_size=avg_chunk_size,
    )


@router.get("/files/{repo_id}", response_model=list[FileNode])
async def get_file_tree(
    repo_id: str,
    db: AsyncSession = Depends(get_db),
) -> list[FileNode]:
    """
    Return a hierarchical file tree for an indexed repository.
    Each node includes its chunk count and detected language.
    """
    repo = await db.get(Repository, repo_id)
    if repo is None:
        raise HTTPException(status_code=404, detail="Repository not found.")
    if repo.status != RepoStatus.INDEXED:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Repository is not yet indexed.")

    meta_path = Path(settings.faiss_index_dir) / repo_id / "metadata.pkl"
    if not meta_path.exists():
        raise HTTPException(status_code=404, detail="Index metadata not found.")

    with open(meta_path, "rb") as fh:
        metadata: list[dict] = pickle.load(fh)

    file_paths = sorted({m.get("file_path", "") for m in metadata if m.get("file_path")})
    chunk_counts = Counter(m.get("file_path", "") for m in metadata)
    languages = {}
    for m in metadata:
        fp = m.get("file_path", "")
        if fp and fp not in languages:
            languages[fp] = m.get("language", "")

    return _build_file_tree(file_paths, dict(chunk_counts), languages)
