"""
AlphaFlow US v2 - FastAPI 메인 앱
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.core.config import settings
from api.core.database import init_pool, close_pool
from api.models.schemas import HealthResponse

# 로그 설정
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """앱 시작/종료 시 리소스 관리"""
    logger.info("AlphaFlow US v2 시작...")
    logger.info(f"환경: {settings.ENV}")

    try:
        await init_pool()
        logger.info("데이터베이스 풀 초기화 완료")
    except Exception as e:
        logger.error(f"데이터베이스 풀 초기화 실패: {e}")
        raise

    yield

    logger.info("AlphaFlow US v2 종료...")
    await close_pool()
    logger.info("AlphaFlow US v2 종료 완료")


# FastAPI 앱 생성
app = FastAPI(
    title="AlphaFlow US v2",
    description="투자 성향 진단 및 백테스트 플랫폼",
    version="2.0.0",
    lifespan=lifespan
)

# CORS 미들웨어
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===== 라우터 등록 =====
from api.routers import quiz, simulation
app.include_router(quiz.router, prefix="/api/quiz", tags=["Quiz"])
app.include_router(simulation.router, prefix="/api/simulation", tags=["Simulation"])


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """헬스 체크 엔드포인트"""
    from api.core.database import get_pool

    try:
        pool = get_pool()
        async with pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
        db_status = "healthy"
    except Exception as e:
        logger.error(f"헬스체크 실패: {e}")
        db_status = "unhealthy"

    return HealthResponse(
        status="ok" if db_status == "healthy" else "degraded",
        database=db_status,
        version="2.0.0"
    )


@app.get("/")
async def root():
    """루트 엔드포인트"""
    return {
        "service": "AlphaFlow US v2",
        "version": "2.0.0",
        "description": "투자 성향 진단 및 백테스트 플랫폼",
        "docs": "/docs"
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "api.main:app",
        host=settings.APP_HOST,
        port=settings.APP_PORT,
        reload=(settings.ENV == "development"),
        log_level=settings.LOG_LEVEL.lower()
    )
