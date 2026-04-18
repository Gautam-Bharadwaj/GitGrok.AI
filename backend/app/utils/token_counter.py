"""
utils/token_counter.py — Lightweight token counting without a full OpenAI client.

Uses tiktoken (the same tokenizer OpenAI uses) so counts are accurate for
gpt-4o / text-embedding-3-small models.
"""

import logging
from functools import lru_cache

import tiktoken

logger = logging.getLogger(__name__)

# Default encoding for GPT-4o class models
_DEFAULT_ENCODING = "cl100k_base"


@lru_cache(maxsize=4)
def _get_encoding(encoding_name: str) -> tiktoken.Encoding:
    """Return a cached tiktoken Encoding object."""
    return tiktoken.get_encoding(encoding_name)


def count_tokens(text: str, encoding_name: str = _DEFAULT_ENCODING) -> int:
    """
    Return the number of tokens in *text* using *encoding_name*.

    Falls back to a character-based estimate (÷4) if tiktoken is unavailable.
    """
    try:
        enc = _get_encoding(encoding_name)
        return len(enc.encode(text, disallowed_special=()))
    except Exception as exc:  # noqa: BLE001
        logger.warning("tiktoken error, falling back to char estimate: %s", exc)
        return len(text) // 4


def truncate_to_tokens(
    text: str,
    max_tokens: int,
    encoding_name: str = _DEFAULT_ENCODING,
) -> str:
    """
    Truncate *text* so it fits within *max_tokens* tokens.

    Returns the truncated string (complete valid UTF-8).
    """
    try:
        enc = _get_encoding(encoding_name)
        tokens = enc.encode(text, disallowed_special=())
        if len(tokens) <= max_tokens:
            return text
        return enc.decode(tokens[:max_tokens])
    except Exception as exc:  # noqa: BLE001
        logger.warning("tiktoken truncation error: %s", exc)
        # Rough fallback: 4 chars per token
        return text[: max_tokens * 4]
