"""
AI 응답 캐시 (DB 기반)
작업/프롬프트를 해시하여 캐싱, TTL별 만료 처리
"""
import datetime as dt
import hashlib
import json
import logging
from typing import Any, Dict, Optional

from api.core.database import get_pool

logger = logging.getLogger(__name__)

TTL_MAP = {
    "strategy_design": dt.timedelta(days=7),
    "strategy_validation": dt.timedelta(days=7),
    "storytelling": dt.timedelta(days=30),
    "image_generation": dt.timedelta(days=90),
    "news_curation": dt.timedelta(days=1),
}
DEFAULT_TTL = dt.timedelta(days=1)


def _cache_key(task: str, prompt: str) -> str:
    return hashlib.sha256(f"{task}:{prompt}".encode("utf-8")).hexdigest()


def _prompt_hash(prompt: str) -> str:
    return hashlib.sha256(prompt.encode("utf-8")).hexdigest()


def _is_expired(created_at: Optional[dt.datetime], task: str) -> bool:
    if not created_at:
        return True
    ttl = TTL_MAP.get(task, DEFAULT_TTL)
    now = dt.datetime.now(dt.timezone.utc)
    return created_at < now - ttl


async def get(task: str, prompt: str) -> Optional[Dict[str, Any]]:
    """캐시 조회"""
    key = _cache_key(task, prompt)
    pool = get_pool()

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT response_json, created_at FROM ai_cache WHERE cache_key = $1",
            key
        )

    if not row:
        return None

    if _is_expired(row["created_at"], task):
        logger.info(f"AI 캐시 만료: task={task}, key={key}")
        return None

    try:
        return json.loads(row["response_json"])
    except Exception:
        logger.warning("AI 캐시 JSON 파싱 실패, 캐시 무시")
        return None


async def set(task: str, prompt: str, response: Dict[str, Any]) -> None:
    """캐시 저장"""
    key = _cache_key(task, prompt)
    prompt_hash = _prompt_hash(prompt)
    payload = json.dumps(response, ensure_ascii=False)

    pool = get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO ai_cache (cache_key, task, prompt_hash, response_json, created_at)
            VALUES ($1, $2, $3, $4, NOW())
            ON CONFLICT (cache_key) DO UPDATE
            SET response_json = EXCLUDED.response_json,
                created_at = NOW()
            """,
            key,
            task,
            prompt_hash,
            payload
        )
