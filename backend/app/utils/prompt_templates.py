"""
utils/prompt_templates.py — LLM prompt templates for every query type.

All prompts are structured as lists of OpenAI-style message dicts so they
can be passed directly to the chat completions API.
"""

from typing import Any


# ── System prompts ────────────────────────────────────────────────────────────

BASE_SYSTEM = """You are an expert code analyst assistant. You have been given \
relevant code chunks retrieved from the repository "{repo_name}".

RULES:
- Always cite exact file paths when referencing code (format: `path/to/file.py:L10-20`)
- If the retrieved context does not contain enough information, say so explicitly
- Format all code in fenced markdown blocks with the correct language tag
- Be concise but thorough; prefer bullet points for lists
- For security / bug findings, classify severity: CRITICAL | WARNING | INFO
- Never fabricate code that is not present in the retrieved context"""


# ── Context block builder ─────────────────────────────────────────────────────

def build_context_block(chunks: list[dict[str, Any]]) -> str:
    """
    Render a list of retrieved chunk dicts into a readable context block.

    Each chunk dict must have: file_path, start_line, end_line, content,
    and optionally name / chunk_type.
    """
    parts: list[str] = []
    for i, chunk in enumerate(chunks, 1):
        name_info = f" [{chunk.get('name', '')}]" if chunk.get("name") else ""
        header = (
            f"--- Chunk {i}: {chunk['file_path']}:L{chunk['start_line']}-{chunk['end_line']}"
            f"{name_info} ---"
        )
        parts.append(f"{header}\n```{chunk.get('language', '')}\n{chunk['content']}\n```")
    return "\n\n".join(parts)


# ── Specialised prompt builders ───────────────────────────────────────────────

def explain_query_prompt(
    query: str, repo_name: str, context: str
) -> list[dict[str, str]]:
    """Messages for an architecture / explanation request."""
    system = BASE_SYSTEM.format(repo_name=repo_name)
    user = (
        f"Question: {query}\n\n"
        f"RETRIEVED CONTEXT:\n{context}\n\n"
        "Please explain clearly, citing the relevant files and line numbers."
    )
    return [{"role": "system", "content": system}, {"role": "user", "content": user}]


def bug_detection_prompt(
    repo_name: str, context: str
) -> list[dict[str, str]]:
    """Messages for a bug / security scan request."""
    system = BASE_SYSTEM.format(repo_name=repo_name)
    user = (
        "Perform a thorough security and logic bug analysis on the following code.\n\n"
        f"RETRIEVED CONTEXT:\n{context}\n\n"
        "Return findings as a structured list with fields: severity, file, line_range, "
        "description, suggestion.  Use CRITICAL for exploitable vulnerabilities, "
        "WARNING for logic / design issues, INFO for code quality notes."
    )
    return [{"role": "system", "content": system}, {"role": "user", "content": user}]


def readme_generation_prompt(
    repo_name: str, context: str
) -> list[dict[str, str]]:
    """Messages for README auto-generation."""
    system = BASE_SYSTEM.format(repo_name=repo_name)
    user = (
        f"Generate a comprehensive, professional README.md for the repository `{repo_name}`.\n\n"
        f"RETRIEVED CONTEXT:\n{context}\n\n"
        "Include: project overview, tech stack badges, features list, installation, "
        "usage examples, API reference (if applicable), project structure, and licence section."
    )
    return [{"role": "system", "content": system}, {"role": "user", "content": user}]


def file_summary_prompt(
    file_path: str, repo_name: str, context: str
) -> list[dict[str, str]]:
    """Messages for per-file explanation."""
    system = BASE_SYSTEM.format(repo_name=repo_name)
    user = (
        f"Summarise the file `{file_path}` from repository `{repo_name}`.\n\n"
        f"RETRIEVED CONTEXT:\n{context}\n\n"
        "Cover: purpose, key classes/functions, public API, dependencies, and any gotchas."
    )
    return [{"role": "system", "content": system}, {"role": "user", "content": user}]


def general_query_prompt(
    query: str, repo_name: str, context: str
) -> list[dict[str, str]]:
    """Messages for catch-all questions."""
    system = BASE_SYSTEM.format(repo_name=repo_name)
    user = (
        f"Question: {query}\n\n"
        f"RETRIEVED CONTEXT:\n{context}\n\n"
        "Answer the question using only the provided context.  Cite sources."
    )
    return [{"role": "system", "content": system}, {"role": "user", "content": user}]
