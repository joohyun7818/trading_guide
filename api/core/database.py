"""
AlphaFlow US v2 - 데이터베이스 연결 풀
asyncpg로 PostgreSQL 연결 관리
"""
import logging
from typing import Optional
import asyncpg

from api.core.config import settings


logger = logging.getLogger(__name__)

# 전역 연결 풀
_pool: Optional[asyncpg.Pool] = None


async def init_pool() -> None:
    """데이터베이스 연결 풀 초기화"""
    global _pool

    try:
        logger.info(f"데이터베이스 연결 풀 초기화 중... (URL: {settings.DATABASE_URL[:30]}...)")

        _pool = await asyncpg.create_pool(
            dsn=settings.DATABASE_URL,
            min_size=2,
            max_size=10,
            command_timeout=60,
            timeout=30
        )

        # 연결 테스트
        async with _pool.acquire() as conn:
            version = await conn.fetchval("SELECT version()")
            logger.info(f"데이터베이스 연결 성공: {version[:50]}...")

    except Exception as e:
        logger.error(f"데이터베이스 연결 풀 초기화 실패: {e}")
        raise


async def close_pool() -> None:
    """데이터베이스 연결 풀 종료"""
    global _pool

    if _pool:
        try:
            logger.info("데이터베이스 연결 풀 종료 중...")
            await _pool.close()
            _pool = None
            logger.info("데이터베이스 연결 풀 종료 완료")
        except Exception as e:
            logger.error(f"데이터베이스 연결 풀 종료 실패: {e}")


def get_pool() -> asyncpg.Pool:
    """현재 데이터베이스 연결 풀 반환

    Returns:
        asyncpg.Pool: 데이터베이스 연결 풀

    Raises:
        RuntimeError: 풀이 초기화되지 않은 경우
    """
    if _pool is None:
        raise RuntimeError("데이터베이스 연결 풀이 초기화되지 않았습니다. init_pool()을 먼저 호출하세요.")
    return _pool
