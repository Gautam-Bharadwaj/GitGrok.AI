"""
services/cache_service.py — Redis-backed query caching (L1) plus helpers for
repo status caching.

L1 – Query cache  (Redis, TTL 1 hr):  Avoids redundant LLM calls for identical
                                       questions on the same repo.
L2 – FAISS index  (Disk):             Handled by embedding_service.py.
L3 – File summaries (DB):             Stored by the chat message record.
"""

import hashlib
import json
import logging
from typing import Any, Optional

import redis.asyncio as aioredis

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_QUERY_TTL = 3600  # 1 hour
_STATUS_TTL = 300  # 5 minutes


def _redis_client() -> aioredis.Redis:
    """Return a connection to Redis using the configured URL."""
    return aioredis.from_url(settings.redis_url, decode_responses=True)


def _query_cache_key(repo_id: str, question: str) -> str:
    """Build a deterministic cache key from repo_id + question hash."""
    digest = hashlib.sha256(f"{repo_id}:{question}".encode()).hexdigest()
    return f"query:{digest}"


async def get_cached_answer(repo_id: str, question: str) -> Optional[dict[str, Any]]:
    """
    Return a cached answer dict if one exists, else None.

    Args:
        repo_id:  Repository being queried.
        question: Exact question text.
    """
    try:
        r = _redis_client()
        key = _query_cache_key(repo_id, question)
        raw = await r.get(key)
        if raw:
            logger.debug("Cache HIT: %s", key[:20])
            return json.loads(raw)
        logger.debug("Cache MISS: %s", key[:20])
    except Exception as exc:  # noqa: BLE001
        logger.warning("Redis get failed (cache disabled for this request): %s", exc)
    return None


async def set_cached_answer(
    repo_id: str,
    question: str,
    answer: dict[str, Any],
    ttl: int = _QUERY_TTL,
) -> None:
    """
    Store *answer* in Redis under the query key.

    Args:
        repo_id:  Repository identifier.
        question: Exact question string.
        answer:   Serialisable answer dict (must not contain generator objects).
        ttl:      Cache TTL in seconds.
    """
    try:
        r = _redis_client()
        key = _query_cache_key(repo_id, question)
        await r.set(key, json.dumps(answer), ex=ttl)
        logger.debug("Cached answer: %s (TTL=%ds)", key[:20], ttl)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Redis set failed (answer not cached): %s", exc)


async def set_repo_status_cache(repo_id: str, status: dict[str, Any]) -> None:
    """Cache the latest repo ingestion status for fast polling."""
    try:
        r = _redis_client()
        await r.set(f"repo_status:{repo_id}", json.dumps(status), ex=_STATUS_TTL)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Redis repo status cache failed: %s", exc)


async def get_repo_status_cache(repo_id: str) -> Optional[dict[str, Any]]:
    """Return cached repo status if available."""
    try:
        r = _redis_client()
        raw = await r.get(f"repo_status:{repo_id}")
        if raw:
            return json.loads(raw)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Redis repo status get failed: %s", exc)
    return None


async def invalidate_repo_cache(repo_id: str) -> None:
    """Remove all cached data associated with *repo_id* (pattern delete)."""
    try:
        r = _redis_client()
        pattern = f"query:*"
        cursor = 0
        to_delete = [f"repo_status:{repo_id}"]
        # NOTE: SCAN for query keys is O(N) — acceptable since cache is invalidated
        # only on repo delete, which is a rare admin operation.
        while True:
            cursor, keys = await r.scan(cursor, match=pattern, count=200)
            # We can't filter by repo_id efficiently without a secondary index,
            # so we only delete the repo_status key and let query keys expire naturally.
            if cursor == 0:
                break
        await r.delete(*to_delete)
        logger.info("Invalidated cache for repo %s", repo_id)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Redis invalidation failed: %s", exc)
