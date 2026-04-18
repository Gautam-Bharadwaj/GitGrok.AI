"""
utils/file_filter.py — Decides which files in a cloned repo should be indexed.

Filters out build artefacts, virtual environments, binary files, and files
that are too large.  Returns only source files with recognised extensions.
"""

from pathlib import Path

# ── Directories to skip entirely ─────────────────────────────────────────────
IGNORE_DIRS: frozenset[str] = frozenset({
    "node_modules", ".git", "__pycache__", ".next", "dist",
    "build", "venv", ".venv", "env", ".env",
    "coverage", ".pytest_cache", ".mypy_cache", ".ruff_cache",
    "vendor", "target", ".gradle", "bin", "obj",
    ".tox", "htmlcov", "site-packages", ".idea", ".vscode",
})

# ── File extensions that are worth indexing ───────────────────────────────────
SUPPORTED_EXTENSIONS: frozenset[str] = frozenset({
    # Web / TypeScript / JavaScript
    ".js", ".ts", ".tsx", ".jsx", ".mjs", ".cjs",
    # Python
    ".py",
    # Systems languages
    ".go", ".rs", ".c", ".cpp", ".cc", ".h", ".hpp",
    # JVM
    ".java", ".kt", ".scala",
    # .NET
    ".cs",
    # Scripting
    ".rb", ".php", ".sh", ".bash",
    # Config / Markup
    ".md", ".mdx", ".rst",
    ".yml", ".yaml", ".toml", ".ini",
    ".json", ".jsonc",
    ".env.example", ".env.sample",
    # SQL
    ".sql",
    # HTML / CSS (selectively)
    ".html", ".css", ".scss",
    # Dockerfile
    "Dockerfile",
})

MAX_FILE_SIZE_KB: int = 500  # files larger than this are skipped


def should_index_file(file_path: Path) -> bool:
    """
    Return True if *file_path* should be included in the FAISS index.

    Checks:
    1. No ancestor directory is in IGNORE_DIRS.
    2. The file extension (or full name for Dockerfile-like names) is supported.
    3. The file is not too large.
    """
    # 1. Check ancestor directories
    for part in file_path.parts:
        if part in IGNORE_DIRS:
            return False

    # 2. Check extension or full filename
    ext = file_path.suffix.lower()
    name = file_path.name
    if ext not in SUPPORTED_EXTENSIONS and name not in SUPPORTED_EXTENSIONS:
        return False

    # 3. Size gate
    try:
        size_kb = file_path.stat().st_size / 1024
        if size_kb > MAX_FILE_SIZE_KB:
            return False
    except OSError:
        return False

    return True


def collect_source_files(root: Path) -> list[Path]:
    """
    Walk *root* recursively and return all files that pass :func:`should_index_file`.
    Paths are returned sorted (deterministic ordering for reproducible indexes).
    """
    result: list[Path] = []
    for file_path in root.rglob("*"):
        if file_path.is_file() and should_index_file(file_path):
            result.append(file_path)
    result.sort()
    return result
