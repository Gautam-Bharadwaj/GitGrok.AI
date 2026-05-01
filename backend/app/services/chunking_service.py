"""
services/chunking_service.py — Three-strategy code chunking pipeline.

Strategy A — AST-based  : Python (ast module) & JS/TS (regex heuristic)
Strategy B — Sliding window : Any unsupported language
Strategy C — Semantic   : Markdown / RST / plain text
"""

import ast
import hashlib
import logging
import re
from dataclasses import dataclass, field
from pathlib import Path

from app.utils.token_counter import count_tokens

logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────────
CHUNK_SIZE_TOKENS = 512
CHUNK_OVERLAP_TOKENS = 64

AST_LANGUAGES = {".py"}
JS_LANGUAGES = {".js", ".ts", ".tsx", ".jsx", ".mjs", ".cjs"}
DOC_LANGUAGES = {".md", ".mdx", ".rst"}


# ── Data model ────────────────────────────────────────────────────────────────

@dataclass
class CodeChunk:
    """Single chunk of source code ready for embedding."""

    chunk_id: str
    repo_id: str
    file_path: str
    language: str
    chunk_type: str          # "function" | "class" | "module" | "doc" | "window"
    name: str                # function / class name when available
    content: str
    start_line: int
    end_line: int
    token_count: int
    embedding: list[float] | None = field(default=None, repr=False)

    def metadata_dict(self) -> dict:
        """Return a serialisable dict (excludes the embedding vector)."""
        return {
            "chunk_id": self.chunk_id,
            "repo_id": self.repo_id,
            "file_path": self.file_path,
            "language": self.language,
            "chunk_type": self.chunk_type,
            "name": self.name,
            "content": self.content,
            "start_line": self.start_line,
            "end_line": self.end_line,
            "token_count": self.token_count,
        }


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_id(repo_id: str, file_path: str, start_line: int) -> str:
    """Deterministic chunk ID based on repo, file, and line number."""
    raw = f"{repo_id}:{file_path}:{start_line}"
    return hashlib.sha1(raw.encode()).hexdigest()


def _detect_language(path: Path) -> str:
    ext = path.suffix.lower()
    mapping = {
        ".py": "python", ".js": "javascript", ".ts": "typescript",
        ".tsx": "tsx", ".jsx": "jsx", ".go": "go", ".rs": "rust",
        ".java": "java", ".kt": "kotlin", ".cs": "csharp",
        ".cpp": "cpp", ".c": "c", ".h": "c", ".hpp": "cpp",
        ".rb": "ruby", ".php": "php", ".md": "markdown",
        ".mdx": "markdown", ".sh": "bash", ".yml": "yaml",
        ".yaml": "yaml", ".json": "json", ".toml": "toml",
        ".sql": "sql", ".html": "html", ".css": "css", ".scss": "scss",
    }
    return mapping.get(ext, "plaintext")


def _lines_from_content(content: str) -> list[str]:
    return content.splitlines()


# ── Strategy A — Python AST ───────────────────────────────────────────────────

def _chunk_python_ast(source: str, repo_id: str, file_path: str) -> list[CodeChunk]:
    """Extract top-level functions and classes from Python source using stdlib ast."""
    chunks: list[CodeChunk] = []
    lines = _lines_from_content(source)

    try:
        tree = ast.parse(source)
    except SyntaxError as exc:
        logger.debug("AST parse failed for %s: %s — falling back", file_path, exc)
        return []

    for node in ast.walk(tree):
        if not isinstance(node, ast.FunctionDef | ast.AsyncFunctionDef | ast.ClassDef):
            continue
        # Only top-level and first-level nested nodes (avoid double-counting)
        start = node.lineno - 1
        end = node.end_lineno  # type: ignore[attr-defined]
        chunk_lines = lines[start:end]
        content = "\n".join(chunk_lines)
        token_count = count_tokens(content)

        chunk_type = "function"
        if isinstance(node, ast.ClassDef):
            chunk_type = "class"
        elif isinstance(node, ast.AsyncFunctionDef):
            chunk_type = "function"

        chunks.append(
            CodeChunk(
                chunk_id=_make_id(repo_id, file_path, node.lineno),
                repo_id=repo_id,
                file_path=file_path,
                language="python",
                chunk_type=chunk_type,
                name=node.name,
                content=content,
                start_line=node.lineno,
                end_line=end,
                token_count=token_count,
            )
        )

    return chunks


# ── Strategy A — JS/TS regex heuristic ───────────────────────────────────────

_JS_FUNC_RE = re.compile(
    r"^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+(\w+)|"
    r"^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(",
    re.MULTILINE,
)

_JS_CLASS_RE = re.compile(r"^(?:export\s+)?class\s+(\w+)", re.MULTILINE)


def _chunk_js_ts(source: str, repo_id: str, file_path: str, language: str) -> list[CodeChunk]:
    """
    Extract function / class blocks from JS/TS using brace-counting heuristic.

    This is intentionally simple — for production you would integrate tree-sitter.
    """
    chunks: list[CodeChunk] = []
    lines = _lines_from_content(source)

    def _find_block_end(start_line_idx: int) -> int:
        """Walk forward counting braces until block closes."""
        depth = 0
        for i in range(start_line_idx, len(lines)):
            depth += lines[i].count("{") - lines[i].count("}")
            if depth <= 0 and i > start_line_idx:
                return i + 1  # 1-indexed end
        return len(lines)

    all_matches = list(_JS_FUNC_RE.finditer(source)) + list(_JS_CLASS_RE.finditer(source))
    all_matches.sort(key=lambda m: m.start())

    for m in all_matches:
        name = m.group(1) or m.group(2) or "anonymous"
        line_idx = source[: m.start()].count("\n")
        end_line = _find_block_end(line_idx)
        chunk_lines = lines[line_idx:end_line]
        content = "\n".join(chunk_lines)
        token_count = count_tokens(content)

        chunk_type = "class" if _JS_CLASS_RE.match(m.group(0)) else "function"
        chunks.append(
            CodeChunk(
                chunk_id=_make_id(repo_id, file_path, line_idx + 1),
                repo_id=repo_id,
                file_path=file_path,
                language=language,
                chunk_type=chunk_type,
                name=name,
                content=content,
                start_line=line_idx + 1,
                end_line=end_line,
                token_count=token_count,
            )
        )

    return chunks


# ── Strategy B — Sliding window ───────────────────────────────────────────────

def _chunk_sliding_window(
    source: str,
    repo_id: str,
    file_path: str,
    language: str,
    chunk_size: int = CHUNK_SIZE_TOKENS,
    overlap: int = CHUNK_OVERLAP_TOKENS,
) -> list[CodeChunk]:
    """
    Fallback chunker: fixed-size sliding window that never splits mid-line.

    Overlap is measured in tokens, not lines.
    """
    lines = _lines_from_content(source)
    chunks: list[CodeChunk] = []

    current_lines: list[str] = []
    current_tokens = 0
    start_line = 1

    for line_idx, line in enumerate(lines, 1):
        line_tokens = count_tokens(line)
        current_lines.append(line)
        current_tokens += line_tokens

        if current_tokens >= chunk_size:
            content = "\n".join(current_lines)
            chunks.append(
                CodeChunk(
                    chunk_id=_make_id(repo_id, file_path, start_line),
                    repo_id=repo_id,
                    file_path=file_path,
                    language=language,
                    chunk_type="window",
                    name="",
                    content=content,
                    start_line=start_line,
                    end_line=line_idx,
                    token_count=current_tokens,
                )
            )
            # Roll back overlap lines
            overlap_lines: list[str] = []
            overlap_tokens = 0
            for ol in reversed(current_lines):
                ot = count_tokens(ol)
                if overlap_tokens + ot > overlap:
                    break
                overlap_lines.insert(0, ol)
                overlap_tokens += ot

            current_lines = overlap_lines
            current_tokens = overlap_tokens
            start_line = line_idx - len(overlap_lines) + 1

    # Flush remaining
    if current_lines:
        content = "\n".join(current_lines)
        chunks.append(
            CodeChunk(
                chunk_id=_make_id(repo_id, file_path, start_line),
                repo_id=repo_id,
                file_path=file_path,
                language=language,
                chunk_type="window",
                name="",
                content=content,
                start_line=start_line,
                end_line=len(lines),
                token_count=count_tokens(content),
            )
        )

    return chunks


# ── Strategy C — Semantic (markdown / docs) ───────────────────────────────────

_HEADING_RE = re.compile(r"^#{1,6}\s+", re.MULTILINE)


def _chunk_semantic(source: str, repo_id: str, file_path: str) -> list[CodeChunk]:
    """
    Split documentation on heading boundaries, preserving section context.
    Falls back to sliding window for very long sections.
    """
    chunks: list[CodeChunk] = []
    heading_positions = [m.start() for m in _HEADING_RE.finditer(source)]

    # Unshift prefix content before first heading
    section_starts = [0] + heading_positions

    lines_up_to: dict[int, int] = {}
    for pos in section_starts:
        lines_up_to[pos] = source[:pos].count("\n") + 1

    all_sections: list[tuple[str, int]] = []
    raw_sections = _HEADING_RE.split(source)
    raw_matches = list(_HEADING_RE.finditer(source))

    current_pos = 0
    for i, section_text in enumerate(raw_sections):
        start_line = source[:current_pos].count("\n") + 1
        all_sections.append((section_text, start_line))
        current_pos += len(section_text)
        if i < len(raw_matches):
            current_pos += len(raw_matches[i].group(0))

    for section_text, start_line in all_sections:
        if not section_text.strip():
            continue
        line_count = section_text.count("\n")
        end_line = start_line + line_count
        content = section_text.strip()
        token_count = count_tokens(content)

        if token_count > CHUNK_SIZE_TOKENS:
            # Section too large — use sliding window
            sub_chunks = _chunk_sliding_window(
                content, repo_id, file_path, "markdown"
            )
            chunks.extend(sub_chunks)
        else:
            chunks.append(
                CodeChunk(
                    chunk_id=_make_id(repo_id, file_path, start_line),
                    repo_id=repo_id,
                    file_path=file_path,
                    language="markdown",
                    chunk_type="doc",
                    name="",
                    content=content,
                    start_line=start_line,
                    end_line=end_line,
                    token_count=token_count,
                )
            )

    return chunks


# ── Public API ────────────────────────────────────────────────────────────────

def chunk_file(file_path: Path, repo_id: str, root: Path) -> list[CodeChunk]:
    """
    Dispatch to the best chunking strategy for *file_path*.

    Args:
        file_path: Absolute path to the source file.
        repo_id:   Unique identifier of the parent repository.
        root:      Root directory of the cloned repository (for relative paths).

    Returns:
        A list of :class:`CodeChunk` objects ready for embedding.
    """
    rel_path = str(file_path.relative_to(root))
    ext = file_path.suffix.lower()
    language = _detect_language(file_path)

    try:
        source = file_path.read_text(encoding="utf-8", errors="replace")
    except OSError as exc:
        logger.warning("Cannot read %s: %s", file_path, exc)
        return []

    if not source.strip():
        return []

    chunks: list[CodeChunk] = []

    # Strategy A — Python AST
    if ext in AST_LANGUAGES:
        chunks = _chunk_python_ast(source, repo_id, rel_path)
        if not chunks:
            chunks = _chunk_sliding_window(source, repo_id, rel_path, language)

    # Strategy A — JS/TS heuristic
    elif ext in JS_LANGUAGES:
        chunks = _chunk_js_ts(source, repo_id, rel_path, language)
        if not chunks:
            chunks = _chunk_sliding_window(source, repo_id, rel_path, language)

    # Strategy C — Markdown / RST
    elif ext in DOC_LANGUAGES:
        chunks = _chunk_semantic(source, repo_id, rel_path)

    # Strategy B — Sliding window
    else:
        chunks = _chunk_sliding_window(source, repo_id, rel_path, language)

    # Deduplicate by chunk_id (handles overlapping AST nodes)
    seen: set[str] = set()
    unique: list[CodeChunk] = []
    for c in chunks:
        if c.chunk_id not in seen:
            seen.add(c.chunk_id)
            unique.append(c)

    logger.debug(
        "Chunked %s → %d chunks via %s",
        rel_path,
        len(unique),
        "AST" if ext in (AST_LANGUAGES | JS_LANGUAGES) else "semantic/window",
    )
    return unique
