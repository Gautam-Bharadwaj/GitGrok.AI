"""
routes/analysis.py — Advanced analysis endpoints.

POST /api/v1/analysis/bugs    — Security & logic bug scan
POST /api/v1/analysis/readme  — Auto-generate README
"""

import logging
import re
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.repo import Repository, RepoStatus
from app.services.llm_service import get_answer, handle_bug_detection, handle_readme_generation
from app.services.retrieval_service import build_context, retrieve

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/analysis", tags=["Analysis"])


# ── Schemas ────────────────────────────────────────────────────────────────────

class BugsRequest(BaseModel):
    repo_id: str
    file_path: Optional[str] = Field(None, description="Limit scan to a specific file")


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
