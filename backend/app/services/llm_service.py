"""
services/llm_service.py — Streaming and non-streaming LLM calls via OpenAI,
with specialised handlers for different query intents.
"""

import json
import logging
import re
from typing import Optional, Any, AsyncGenerator

from openai import AsyncOpenAI

from app.config import get_settings
from app.services.retrieval_service import build_context, retrieve
from app.utils.prompt_templates import (
    bug_detection_prompt,
    explain_query_prompt,
    file_summary_prompt,
    general_query_prompt,
    readme_generation_prompt,
)

logger = logging.getLogger(__name__)
settings = get_settings()


def _get_client() -> AsyncOpenAI:
    provider = settings.llm_provider.lower()
    if provider == "groq":
        return AsyncOpenAI(
            api_key=settings.groq_api_key,
            base_url="https://api.groq.com/openai/v1"
        )
    if provider == "ollama":
        return AsyncOpenAI(
            api_key="ollama",  # Not used by local Ollama
            base_url=f"{settings.ollama_base_url}/v1"
        )
    # Default to OpenAI
    return AsyncOpenAI(api_key=settings.openai_api_key)


def _get_model() -> str:
    provider = settings.llm_provider.lower()
    if provider == "groq":
        return settings.groq_model
    if provider == "ollama":
        return settings.ollama_model
    return settings.openai_model


# ── Intent detection ───────────────────────────────────────────────────────────

_EXPLAIN_PATTERNS = re.compile(
    r"\b(explain|describe|how does|what is|overview|architecture|flow)\b",
    re.IGNORECASE,
)
_BUG_PATTERNS = re.compile(
    r"\b(bug|vuln|security|exploit|issue|problem|error|fix|patch)\b",
    re.IGNORECASE,
)
_README_PATTERNS = re.compile(
    r"\b(readme|documentation|doc|generate doc)\b",
    re.IGNORECASE,
)
_FILE_PATTERNS = re.compile(
    r"\b(summaris|summar|what does .+ do|file|module)\b",
    re.IGNORECASE,
)


def _detect_intent(query: str) -> str:
    """
    Classify the query into one of: explain | bug | readme | file | general.
    Intent drives which prompt template and handler is used.
    """
    if _README_PATTERNS.search(query):
        return "readme"
    if _BUG_PATTERNS.search(query):
        return "bug"
    if _EXPLAIN_PATTERNS.search(query):
        return "explain"
    if _FILE_PATTERNS.search(query):
        return "file"
    return "general"


# ── Handlers ───────────────────────────────────────────────────────────────────

async def handle_explain_query(
    query: str, repo_id: str, repo_name: str, chunks: list[dict]
) -> list[dict[str, str]]:
    """Build messages for architecture / explanation questions."""
    context = build_context(chunks)
    return explain_query_prompt(query, repo_name, context)


async def handle_bug_detection(
    repo_id: str, repo_name: str, chunks: list[dict], file_path: str = ""
) -> list[dict[str, str]]:
    """Build messages for security / bug scanning."""
    context = build_context(chunks)
    return bug_detection_prompt(repo_name, context)


async def handle_readme_generation(
    repo_id: str, repo_name: str, chunks: list[dict]
) -> list[dict[str, str]]:
    """Build messages for README auto-generation."""
    context = build_context(chunks)
    return readme_generation_prompt(repo_name, context)


async def handle_file_summary(
    file_path: str, repo_id: str, repo_name: str, chunks: list[dict]
) -> list[dict[str, str]]:
    """Build messages for per-file explanation."""
    context = build_context(chunks)
    return file_summary_prompt(file_path, repo_name, context)


async def handle_general_query(
    query: str, repo_id: str, repo_name: str, chunks: list[dict]
) -> list[dict[str, str]]:
    """Build messages for general / catch-all questions."""
    context = build_context(chunks)
    return general_query_prompt(query, repo_name, context)


# ── Core streaming response ─────────────────────────────────────────────────────

async def stream_answer(
    messages: list[dict[str, str]],
) -> AsyncGenerator[str, None]:
    """
    Call the OpenAI chat API with stream=True and yield content deltas.

    Handles client disconnects gracefully — the generator simply stops.

    Yields:
        Raw text tokens as they arrive from the API.
    """
    client = _get_client()
    model = _get_model()
    try:
        async with client.chat.completions.stream(
            model=model,
            messages=messages,  # type: ignore[arg-type]
            temperature=0.2,
            max_tokens=2048,
        ) as stream:
            async for event in stream:
                delta = event.choices[0].delta.content if event.choices else None
                if delta:
                    yield delta
    except Exception as exc:
        logger.error("Streaming LLM error: %s", exc)
        yield f"\n\n[Error: {exc}]"


async def get_answer(
    messages: list[dict[str, str]],
) -> tuple[str, int]:
    """
    Non-streaming LLM call.  Returns (full_text, tokens_used).
    """
    client = _get_client()
    model = _get_model()
    response = await client.chat.completions.create(
        model=model,
        messages=messages,  # type: ignore[arg-type]
        temperature=0.2,
        max_tokens=2048,
    )
    content = response.choices[0].message.content or ""
    tokens = response.usage.total_tokens if response.usage else 0
    return content, tokens


# ── High-level chat entry-point ────────────────────────────────────────────────

async def answer_question(
    query: str,
    repo_id: str,
    repo_name: str,
    stream: bool = True,
) -> dict[str, Any]:
    """
    Full RAG pipeline for a developer question.

    1. Retrieve relevant chunks via FAISS.
    2. Detect query intent.
    3. Build specialised prompt.
    4. Return streaming generator or full answer.

    Returns:
        {
            "stream_gen": AsyncGenerator / None,
            "answer": Optional[str],
            "sources": list[dict],
            "tokens_used": Optional[int],
        }
    """
    # 1. Retrieve
    chunks = await retrieve(query, repo_id)
    sources = [
        {
            "file_path": c["file_path"],
            "start_line": c["start_line"],
            "end_line": c["end_line"],
            "name": c.get("name", ""),
            "language": c.get("language", ""),
            "snippet": c["content"][:300],
        }
        for c in chunks
    ]

    # 2. Intent → messages
    intent = _detect_intent(query)
    if intent == "explain":
        messages = await handle_explain_query(query, repo_id, repo_name, chunks)
    elif intent == "bug":
        messages = await handle_bug_detection(repo_id, repo_name, chunks)
    elif intent == "readme":
        messages = await handle_readme_generation(repo_id, repo_name, chunks)
    elif intent == "file":
        file_match = re.search(r"[\w./\\-]+\.\w{1,5}", query)
        fp = file_match.group(0) if file_match else ""
        messages = await handle_file_summary(fp, repo_id, repo_name, chunks)
    else:
        messages = await handle_general_query(query, repo_id, repo_name, chunks)

    if stream:
        return {
            "stream_gen": stream_answer(messages),
            "answer": None,
            "sources": sources,
            "tokens_used": None,
        }
    else:
        answer, tokens = await get_answer(messages)
        return {
            "stream_gen": None,
            "answer": answer,
            "sources": sources,
            "tokens_used": tokens,
        }
