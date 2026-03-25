"""
AlphaFlow US v2 - 백테스트/스트레스 테스트 라우터
"""
import json
import logging
from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from api.core.database import get_pool
from api.models.schemas import BacktestRunRequest
from api.services import backtester, stress_tester, strategy_mapper

logger = logging.getLogger(__name__)
router = APIRouter()


def _parse_json_field(value):
    if value is None:
        return {}
    if isinstance(value, (dict, list)):
        return value
    try:
        return json.loads(value)
    except Exception:
        return {}


async def _load_quiz_session(quiz_session_id: UUID):
    pool = get_pool()
    async with pool.acquire() as conn:
        return await conn.fetchrow(
            """
            SELECT id, risk_score, expertise_level, strategy_key, detail_level, advanced_answers
            FROM quiz_sessions
            WHERE id = $1
            """,
            quiz_session_id
        )


def _build_strategy(session_row) -> dict:
    if not session_row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="퀴즈 세션을 찾을 수 없습니다."
        )

    risk_score = session_row["risk_score"]
    if risk_score is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="퀴즈를 완료한 후 백테스트를 실행해주세요."
        )

    strategy = strategy_mapper.map_strategy(int(risk_score))
    advanced_answers = _parse_json_field(session_row["advanced_answers"])
    if advanced_answers:
        strategy = strategy_mapper.customize_strategy(strategy, advanced_answers)

    return strategy


@router.post("/run")
async def run_backtest(request: BacktestRunRequest):
    """백테스트 실행 후 DB 저장"""
    try:
        session_row = await _load_quiz_session(request.quiz_session_id)
        strategy = _build_strategy(session_row)

        results = await backtester.run_all_periods(strategy)

        pool = get_pool()
        async with pool.acquire() as conn:
            for result in results:
                await conn.execute(
                    """
                    INSERT INTO backtest_results
                    (quiz_session_id, strategy, period, metrics, daily_equity, benchmark_equity, created_at)
                    VALUES ($1, $2, $3, $4, $5, $6, NOW())
                    """,
                    request.quiz_session_id,
                    json.dumps(strategy),
                    result.get("period"),
                    json.dumps(result.get("metrics")),
                    json.dumps(result.get("daily_equity")),
                    json.dumps(result.get("benchmark_equity"))
                )

        return {"quiz_session_id": str(request.quiz_session_id), "results": results}

    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"백테스트 실행 실패: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"백테스트 실행 중 오류가 발생했습니다: {exc}"
        )


@router.post("/stress-test")
async def run_stress_test(request: BacktestRunRequest):
    """스트레스 테스트 실행 후 DB 저장"""
    try:
        session_row = await _load_quiz_session(request.quiz_session_id)
        strategy = _build_strategy(session_row)
        detail_level = session_row["detail_level"] or "beginner"

        results = await stress_tester.run_stress_test(strategy, detail_level)

        pool = get_pool()
        async with pool.acquire() as conn:
            for result in results:
                await conn.execute(
                    """
                    INSERT INTO stress_test_results
                    (quiz_session_id, period_key, period_name, my_return, sp500_return, excess_return, recovery_months, created_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                    """,
                    request.quiz_session_id,
                    result.get("period_key"),
                    result.get("period_name"),
                    result.get("my_return"),
                    result.get("sp500_return"),
                    result.get("excess_return"),
                    result.get("recovery_months")
                )

        return {
            "quiz_session_id": str(request.quiz_session_id),
            "detail_level": detail_level,
            "results": results
        }

    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"스트레스 테스트 실행 실패: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"스트레스 테스트 실행 중 오류가 발생했습니다: {exc}"
        )


@router.get("/results/{quiz_session_id}")
async def list_backtest_results(quiz_session_id: UUID):
    """특정 퀴즈 세션의 모든 백테스트 결과"""
    try:
        pool = get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT id, period, metrics, daily_equity, benchmark_equity, created_at
                FROM backtest_results
                WHERE quiz_session_id = $1
                ORDER BY created_at DESC
                """,
                quiz_session_id
            )

        results = []
        for row in rows:
            results.append(
                {
                    "id": str(row["id"]),
                    "period": row["period"],
                    "metrics": row["metrics"] if isinstance(row["metrics"], dict) else _parse_json_field(row["metrics"]),
                    "daily_equity": row["daily_equity"] if isinstance(row["daily_equity"], list) else _parse_json_field(row["daily_equity"]),
                    "benchmark_equity": row["benchmark_equity"] if isinstance(row["benchmark_equity"], list) else _parse_json_field(row["benchmark_equity"]),
                    "created_at": row["created_at"].isoformat() if row["created_at"] else None,
                }
            )

        return results

    except Exception as exc:
        logger.error(f"백테스트 결과 조회 실패: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"백테스트 결과 조회 중 오류가 발생했습니다: {exc}"
        )


@router.get("/results/{quiz_session_id}/{period}")
async def get_backtest_result_by_period(quiz_session_id: UUID, period: str):
    """특정 기간 백테스트 결과 (최신 1건)"""
    try:
        pool = get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT id, period, metrics, daily_equity, benchmark_equity, created_at
                FROM backtest_results
                WHERE quiz_session_id = $1 AND period = $2
                ORDER BY created_at DESC
                LIMIT 1
                """,
                quiz_session_id,
                period
            )

        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="해당 기간의 결과가 없습니다."
            )

        return {
            "id": str(row["id"]),
            "period": row["period"],
            "metrics": row["metrics"] if isinstance(row["metrics"], dict) else _parse_json_field(row["metrics"]),
            "daily_equity": row["daily_equity"] if isinstance(row["daily_equity"], list) else _parse_json_field(row["daily_equity"]),
            "benchmark_equity": row["benchmark_equity"] if isinstance(row["benchmark_equity"], list) else _parse_json_field(row["benchmark_equity"]),
            "created_at": row["created_at"].isoformat() if row["created_at"] else None,
        }

    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"백테스트 결과 단일 조회 실패: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"백테스트 결과 조회 중 오류가 발생했습니다: {exc}"
        )


@router.get("/stress/{quiz_session_id}")
async def list_stress_results(quiz_session_id: UUID):
    """스트레스 테스트 결과 조회"""
    try:
        pool = get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT period_key, period_name, my_return, sp500_return, excess_return, recovery_months, created_at
                FROM stress_test_results
                WHERE quiz_session_id = $1
                ORDER BY created_at DESC
                """,
                quiz_session_id
            )

        results = [
            {
                "period_key": row["period_key"],
                "period_name": row["period_name"],
                "my_return": row["my_return"],
                "sp500_return": row["sp500_return"],
                "excess_return": row["excess_return"],
                "recovery_months": row["recovery_months"],
                "created_at": row["created_at"].isoformat() if row["created_at"] else None,
            }
            for row in rows
        ]

        return results

    except Exception as exc:
        logger.error(f"스트레스 테스트 결과 조회 실패: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"스트레스 테스트 결과 조회 중 오류가 발생했습니다: {exc}"
        )
