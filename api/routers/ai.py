"""
AI 서비스 라우터
Gemini/Haiku 기반 전략 설계, 코멘터리, 스토리, 이미지, 뉴스 큐레이션
"""
import json
import logging
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from api.core.database import get_pool
from api.models.schemas import (
    AICommentaryRequest,
    AICommentaryResponse,
    AIImageRequest,
    AIImageResponse,
    AINewsCurationRequest,
    AIStoryRequest,
    AIStoryResponse,
    AIStrategyDesignResponse,
    AIStrategyRequest,
)
from api.services import backtester, simulation_engine, strategy_mapper
from api.services.ai import prompts
from api.services.ai import router as ai_router

logger = logging.getLogger(__name__)
router = APIRouter()


# ===== 내부 유틸 =====

def _parse_json_field(value: Any) -> Any:
    if value is None:
        return {}
    if isinstance(value, (dict, list)):
        return value
    try:
        return json.loads(value)
    except Exception:
        return {}


def _normalize_actions(raw_actions: Any) -> List[Dict[str, Any]]:
    if not raw_actions:
        return []

    if isinstance(raw_actions, str):
        try:
            raw_actions = json.loads(raw_actions)
        except json.JSONDecodeError:
            return []

    if isinstance(raw_actions, dict):
        raw_actions = [
            {"scenario_key": key, "action": value}
            for key, value in raw_actions.items()
        ]

    normalized: List[Dict[str, Any]] = []
    for entry in raw_actions:
        if not isinstance(entry, dict):
            continue
        normalized.append({
            "scenario_key": entry.get("scenario_key"),
            "action": entry.get("action"),
            "action_score": entry.get("action_score"),
            "market_type": entry.get("market_type"),
        })
    return normalized


async def _load_quiz_session(quiz_session_id: UUID):
    pool = get_pool()
    async with pool.acquire() as conn:
        return await conn.fetchrow(
            """
            SELECT id, risk_score, expertise_level, strategy_key, quiz_answers, advanced_answers
            FROM quiz_sessions
            WHERE id = $1
            """,
            quiz_session_id
        )


async def _load_latest_actions(quiz_session_id: UUID) -> List[Dict[str, Any]]:
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT actions
            FROM simulation_sessions
            WHERE quiz_session_id = $1
            ORDER BY created_at DESC
            LIMIT 1
            """,
            quiz_session_id
        )
    if not row:
        return []
    return _normalize_actions(row["actions"])


async def _load_backtest_results(quiz_session_id: UUID) -> List[Dict[str, Any]]:
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT period, metrics, created_at
            FROM backtest_results
            WHERE quiz_session_id = $1
            ORDER BY created_at DESC
            LIMIT 10
            """,
            quiz_session_id
        )

    results: List[Dict[str, Any]] = []
    for row in rows:
        metrics = row["metrics"] if isinstance(row["metrics"], dict) else _parse_json_field(row["metrics"])
        results.append(
            {
                "period": row["period"],
                "metrics": metrics or {},
                "created_at": row["created_at"].isoformat() if row["created_at"] else None,
            }
        )
    return results


async def _load_stress_result(quiz_session_id: UUID, period_key: str) -> Optional[Dict[str, Any]]:
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT period_key, period_name, my_return, sp500_return
            FROM stress_test_results
            WHERE quiz_session_id = $1 AND period_key = $2
            ORDER BY created_at DESC
            LIMIT 1
            """,
            quiz_session_id,
            period_key,
        )
    if not row:
        return None
    return dict(row)


def _build_base_strategy(session_row) -> Dict[str, Any]:
    risk_score = int(session_row["risk_score"])
    profile = strategy_mapper.map_strategy(risk_score)
    advanced_answers = _parse_json_field(session_row.get("advanced_answers"))
    if advanced_answers:
        profile = strategy_mapper.customize_strategy(profile, advanced_answers)
    return profile


async def _run_backtest_quick(strategy: Dict[str, Any]) -> Dict[str, Any]:
    """3년 구간 빠른 백테스트 (실패 시 최소 구조 반환)"""
    try:
        result = await backtester.run_backtest(strategy, "3y")
        metrics = result.get("metrics") or {}
        summary = {
            "period": result.get("period", "3y"),
            "total_return": metrics.get("total_return"),
            "cagr": metrics.get("cagr"),
            "mdd": metrics.get("mdd"),
            "sharpe_ratio": metrics.get("sharpe_ratio"),
            "win_rate": metrics.get("win_rate"),
            "raw_metrics": metrics,
        }
        return summary
    except Exception as exc:  # pragma: no cover - 외부 데이터 의존
        logger.error(f"백테스트 실행 실패: {exc}")
        return {"period": "3y", "metrics": {}, "error": str(exc)}


def _ensure_dict(value: Any) -> Dict[str, Any]:
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            return {"text": value}
    return {"result": value}


def _to_data_url(image_payload: Dict[str, Any]) -> Optional[str]:
    data = image_payload.get("image_data")
    mime = image_payload.get("mime_type", "image/png")
    if not data:
        return None
    return f"data:{mime};base64,{data}"


# ===== 엔드포인트 =====


@router.post("/design-strategy", response_model=AIStrategyDesignResponse)
async def design_strategy(request: AIStrategyRequest):
    session = await _load_quiz_session(request.quiz_session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="퀴즈 세션을 찾을 수 없습니다.")
    if session["risk_score"] is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="퀴즈를 완료한 후 이용 가능합니다.")

    risk_score = int(session["risk_score"])
    expertise_level = session.get("expertise_level") or "intermediate"
    quiz_answers = _parse_json_field(session.get("quiz_answers"))
    actions = await _load_latest_actions(request.quiz_session_id)

    design_prompt = prompts.strategy_design_prompt(
        risk_score=risk_score,
        expertise_level=expertise_level,
        quiz_answers=quiz_answers,
        simulation_actions=actions,
        calibrated_score=risk_score,
    )
    design_result = await ai_router.generate(
        "strategy_design",
        design_prompt,
        temperature=0.35,
        max_tokens=900,
        response_format="json",
    )
    strategy = _ensure_dict(design_result)

    current_strategy = strategy
    validations: List[Dict[str, Any]] = []
    for iteration in range(1, 4):
        backtest_summary = await _run_backtest_quick(current_strategy)
        validation_prompt = prompts.strategy_validation_prompt(current_strategy, backtest_summary, iteration)
        validation_result = await ai_router.generate(
            "strategy_validation",
            validation_prompt,
            temperature=0.25,
            max_tokens=900,
            response_format="json",
        )
        if isinstance(validation_result, dict) and validation_result.get("adjusted_strategy"):
            current_strategy = validation_result.get("adjusted_strategy")  # type: ignore[assignment]

        validations.append(
            {
                "iteration": iteration,
                "backtest": backtest_summary,
                "feedback": validation_result,
            }
        )

    return AIStrategyDesignResponse(
        quiz_session_id=request.quiz_session_id,
        strategy=current_strategy,
        validations=validations,
    )


@router.post("/commentary", response_model=AICommentaryResponse)
async def commentary(request: AICommentaryRequest):
    session = await _load_quiz_session(request.quiz_session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="퀴즈 세션을 찾을 수 없습니다.")
    if session["risk_score"] is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="퀴즈를 완료한 후 이용 가능합니다.")

    expertise_level = session.get("expertise_level") or "intermediate"
    strategy_profile = _build_base_strategy(session)
    backtests = await _load_backtest_results(request.quiz_session_id)

    if not backtests:
        backtests = [await _run_backtest_quick(strategy_profile)]

    prompt = prompts.commentary_prompt(backtests, strategy_profile, expertise_level)
    result = await ai_router.generate(
        "commentary",
        prompt,
        temperature=0.4,
        max_tokens=800,
        response_format="json",
    )

    if not isinstance(result, dict):
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="AI 응답 파싱 실패")

    try:
        return AICommentaryResponse(**result)
    except Exception:
        # 부족한 필드가 있으면 기본값 채워서 반환
        return AICommentaryResponse(
            headline=result.get("headline", "요약을 생성하지 못했습니다."),
            summary=result.get("summary", ""),
            period_analysis=result.get("period_analysis", []),
            risk_warning=result.get("risk_warning", ""),
            fun_fact=result.get("fun_fact", ""),
        )


@router.post("/story/{period_key}", response_model=AIStoryResponse)
async def storytelling(period_key: str, request: AIStoryRequest):
    session = await _load_quiz_session(request.quiz_session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="퀴즈 세션을 찾을 수 없습니다.")

    expertise_level = session.get("expertise_level") or "intermediate"
    stress = await _load_stress_result(request.quiz_session_id, period_key)
    if not stress:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="해당 기간의 스트레스 테스트 결과가 없습니다.")

    prompt = prompts.storytelling_prompt(
        period_key=stress["period_key"],
        period_name=stress["period_name"],
        user_return=stress.get("my_return") or 0.0,
        sp500_return=stress.get("sp500_return") or 0.0,
        expertise_level=expertise_level,
    )
    result = await ai_router.generate(
        "storytelling",
        prompt,
        temperature=0.5,
        max_tokens=600,
        response_format="json",
    )

    if not isinstance(result, dict):
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="AI 응답 파싱 실패")

    return AIStoryResponse(
        title=result.get("title", stress["period_name"]),
        story=result.get("story", ""),
        lesson=result.get("lesson", ""),
        emoji=result.get("emoji", "📈"),
    )


@router.post("/image", response_model=AIImageResponse)
async def generate_image(request: AIImageRequest):
    session = await _load_quiz_session(request.quiz_session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="퀴즈 세션을 찾을 수 없습니다.")
    if session["risk_score"] is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="퀴즈를 완료한 후 이용 가능합니다.")

    strategy_profile = _build_base_strategy(session)
    prompt = prompts.image_prompt(strategy_profile["name"], strategy_profile.get("strategy_key", "balanced"))

    result = await ai_router.generate(
        "image_generation",
        prompt,
        temperature=0.2,
        max_tokens=300,
        response_format=None,
    )

    if result.get("placeholder"):
        return AIImageResponse(
            placeholder="https://placehold.co/640x400?text=AI+image+unavailable",
            mime_type=result.get("mime_type"),
        )

    data_url = _to_data_url(result)
    if not data_url:
        return AIImageResponse(
            placeholder="https://placehold.co/640x400?text=AI+image+unavailable",
            mime_type=result.get("mime_type"),
        )

    return AIImageResponse(
        image_url=data_url,
        mime_type=result.get("mime_type", "image/png"),
    )


@router.post("/curate-news")
async def curate_news(request: AINewsCurationRequest):
    session = await _load_quiz_session(request.quiz_session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="퀴즈 세션을 찾을 수 없습니다.")

    expertise_level = session.get("expertise_level") or "intermediate"
    scenario = simulation_engine.get_scenario_by_key(request.scenario_key)
    if not scenario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="시나리오를 찾을 수 없습니다.")

    prompt = prompts.news_curation_prompt(scenario, expertise_level)
    result = await ai_router.generate(
        "news_curation",
        prompt,
        temperature=0.35,
        max_tokens=700,
        response_format="json",
    )

    curated = result.get("curated_news") if isinstance(result, dict) else None
    if curated is None:
        curated = []

    return {
        "quiz_session_id": str(request.quiz_session_id),
        "scenario_key": request.scenario_key,
        "curated_news": curated,
    }
