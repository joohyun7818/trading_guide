"""
AlphaFlow US v2 - 시뮬레이션 라우터
과거 사례 기반 매매 판단 시뮬레이션 API
"""
import asyncio
import json
import logging
from typing import Dict, List
from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from api.core.database import get_pool
from api.models.schemas import (
    SimulationAnswerRequest,
    SimulationCompleteResponse,
    SimulationScenario,
    SimulationStartRequest,
    SimulationStartResponse,
    StrategyResponse,
)
from api.services import calibrator, simulation_engine, strategy_mapper

logger = logging.getLogger(__name__)
router = APIRouter()


def _normalize_actions(raw_actions) -> List[Dict]:
    """DB에 저장된 actions JSON을 표준 리스트 형태로 변환"""
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

    normalized: List[Dict] = []
    for entry in raw_actions:
        if not isinstance(entry, dict):
            continue
        normalized.append({
            "scenario_key": entry.get("scenario_key"),
            "action": entry.get("action"),
            "action_score": entry.get("action_score"),
            "market_type": entry.get("market_type")
        })
    return normalized


@router.post("/start", response_model=SimulationStartResponse)
async def start_simulation(request: SimulationStartRequest):
    """시뮬레이션 시작 - 퀴즈 세션 기반 시나리오 선택"""
    try:
        pool = get_pool()

        async with pool.acquire() as conn:
            quiz_session = await conn.fetchrow(
                "SELECT id, risk_score, expertise_level FROM quiz_sessions WHERE id = $1",
                request.quiz_session_id
            )

            if not quiz_session:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="퀴즈 세션을 찾을 수 없습니다."
                )

            if quiz_session["risk_score"] is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="퀴즈를 완료한 뒤 시뮬레이션을 시작할 수 있습니다."
                )

            expertise_level = quiz_session.get("expertise_level") or "intermediate"
            risk_score = quiz_session["risk_score"]
            scenarios = simulation_engine.select_scenarios(risk_score, expertise_level)
            if request.scenario_count and request.scenario_count < len(scenarios):
                scenarios = scenarios[: request.scenario_count]

            sim_session_id = uuid4()
            await conn.execute(
                """
                INSERT INTO simulation_sessions (id, quiz_session_id, scenarios, created_at)
                VALUES ($1, $2, $3, NOW())
                """,
                sim_session_id,
                request.quiz_session_id,
                json.dumps([s["key"] for s in scenarios])
            )

        chart_tasks = [
            asyncio.to_thread(
                simulation_engine.get_scenario_chart_data,
                scenario["ticker"],
                scenario["chart_start"],
                scenario["chart_end"],
                scenario.get("context")
            )
            for scenario in scenarios
        ]
        chart_results = await asyncio.gather(*chart_tasks)

        scenario_responses = []
        for scenario, chart in zip(scenarios, chart_results):
            payload = {**scenario, "chart": chart}
            payload.pop("aftermath", None)  # 결과는 답변 후 공개
            scenario_responses.append(SimulationScenario(**payload))

        logger.info(
            f"시뮬레이션 세션 생성: {sim_session_id}, quiz_session={request.quiz_session_id}, "
            f"scenarios={len(scenario_responses)}"
        )

        return SimulationStartResponse(
            session_id=sim_session_id,
            scenarios=scenario_responses
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"시뮬레이션 시작 실패: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"시뮬레이션 시작 중 오류 발생: {str(e)}"
        )


@router.post("/answer")
async def submit_simulation_answer(request: SimulationAnswerRequest):
    """시나리오별 사용자 답변 저장"""
    try:
        pool = get_pool()

        async with pool.acquire() as conn:
            session = await conn.fetchrow(
                """
                SELECT id, scenarios, actions
                FROM simulation_sessions
                WHERE id = $1
                """,
                request.session_id
            )

            if not session:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="시뮬레이션 세션을 찾을 수 없습니다."
                )

            scenario_keys = json.loads(session["scenarios"])
            if request.scenario_key not in scenario_keys:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="요청한 시나리오가 세션에 없습니다."
                )

            scenario = simulation_engine.get_scenario_by_key(request.scenario_key)
            if not scenario:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="시나리오 데이터를 찾을 수 없습니다."
                )

            actions = _normalize_actions(session["actions"])

            actions = [
                a for a in actions
                if a.get("scenario_key") != request.scenario_key
            ]

            action_score = simulation_engine.calculate_action_score(
                request.scenario_key,
                request.action
            )

            actions.append({
                "scenario_key": request.scenario_key,
                "action": request.action,
                "action_score": action_score,
                "market_type": scenario.get("market_type", "mixed")
            })

            await conn.execute(
                "UPDATE simulation_sessions SET actions = $1 WHERE id = $2",
                json.dumps(actions),
                request.session_id
            )

        logger.info(
            f"시뮬레이션 답변 저장: session={request.session_id}, "
            f"scenario={request.scenario_key}, action={request.action}"
        )

        aftermath = scenario.get("aftermath", {})

        return {
            "session_id": request.session_id,
            "scenario_key": request.scenario_key,
            "action": request.action,
            "action_score": action_score,
            "aftermath": aftermath,
            "message": "답변이 저장되었습니다."
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"시뮬레이션 답변 저장 실패: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"답변 저장 중 오류 발생: {str(e)}"
        )


class SimulationCompleteRequest(BaseModel):
    """시뮬레이션 완료 요청"""
    session_id: UUID


@router.post("/complete", response_model=SimulationCompleteResponse)
async def complete_simulation(request: SimulationCompleteRequest):
    """시뮬레이션 완료 - 행동 점수 보정 및 전략 재매핑"""
    session_id = request.session_id
    try:
        pool = get_pool()

        async with pool.acquire() as conn:
            sim_session = await conn.fetchrow(
                """
                SELECT id, quiz_session_id, scenarios, actions
                FROM simulation_sessions
                WHERE id = $1
                """,
                session_id
            )

            if not sim_session:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="시뮬레이션 세션을 찾을 수 없습니다."
                )

            quiz_session = await conn.fetchrow(
                "SELECT risk_score FROM quiz_sessions WHERE id = $1",
                sim_session["quiz_session_id"]
            )

            if not quiz_session:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="퀴즈 세션을 찾을 수 없습니다."
                )

            actions = _normalize_actions(sim_session["actions"])
            enriched_actions: List[Dict] = []
            for entry in actions:
                scenario = simulation_engine.get_scenario_by_key(entry.get("scenario_key", ""))
                if not scenario:
                    continue
                enriched_actions.append({
                    "scenario_key": entry.get("scenario_key"),
                    "action": entry.get("action"),
                    "action_score": entry.get("action_score") or simulation_engine.calculate_action_score(
                        entry.get("scenario_key", ""),
                        entry.get("action", "")
                    ),
                    "market_type": entry.get("market_type") or scenario.get("market_type", "mixed")
                })

            quiz_risk_score = quiz_session["risk_score"]
            calibration = calibrator.calibrate(quiz_risk_score, enriched_actions)

            strategy_profile = strategy_mapper.map_strategy(calibration["calibrated_risk_score"])
            strategy_response = StrategyResponse(
                strategy_name=strategy_profile["name"],
                description=strategy_profile["description"],
                asset_allocation=strategy_profile["asset_allocation"],
                equity_detail=strategy_profile["equity_detail"],
                rebalance_frequency=strategy_profile["rebalance_frequency"],
                max_drawdown_tolerance=strategy_profile["max_drawdown_tolerance"],
                reasoning="시뮬레이션 행동을 반영해 재추천된 전략입니다."
            )

            await conn.execute(
                """
                UPDATE simulation_sessions
                SET actions = $1,
                    action_risk_score = $2,
                    calibrated_risk_score = $3,
                    gap_type = $4
                WHERE id = $5
                """,
                json.dumps(enriched_actions),
                calibration["action_risk_score"],
                calibration["calibrated_risk_score"],
                calibration["gap_type"],
                session_id
            )

            await conn.execute(
                """
                UPDATE quiz_sessions
                SET risk_score = $1,
                    strategy_key = $2
                WHERE id = $3
                """,
                calibration["calibrated_risk_score"],
                strategy_profile["strategy_key"],
                sim_session["quiz_session_id"]
            )

        logger.info(
            f"시뮬레이션 완료: session={session_id}, "
            f"action_score={calibration['action_risk_score']}, "
            f"calibrated={calibration['calibrated_risk_score']}, gap={calibration['gap_type']}"
        )

        return SimulationCompleteResponse(
            action_risk_score=calibration["action_risk_score"],
            calibrated_risk_score=calibration["calibrated_risk_score"],
            gap_type=calibration["gap_type"],
            gap=calibration["gap"],
            message=calibration["message"],
            strategy=strategy_response
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"시뮬레이션 완료 처리 실패: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"시뮬레이션 완료 처리 중 오류 발생: {str(e)}"
        )


@router.get("/{session_id}")
async def get_simulation_session(session_id: UUID):
    """시뮬레이션 세션 상세 조회"""
    try:
        pool = get_pool()

        async with pool.acquire() as conn:
            session = await conn.fetchrow(
                """
                SELECT id, quiz_session_id, scenarios, actions,
                       action_risk_score, calibrated_risk_score, gap_type,
                       created_at
                FROM simulation_sessions
                WHERE id = $1
                """,
                session_id
            )

            if not session:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="시뮬레이션 세션을 찾을 수 없습니다."
                )

        scenario_keys = json.loads(session["scenarios"])
        scenarios = [
            simulation_engine.get_scenario_by_key(key)
            for key in scenario_keys
        ]

        actions = _normalize_actions(session["actions"])
        analysis = calibrator.analyze_scenario_performance(actions) if actions else None

        return {
            "session_id": str(session["id"]),
            "quiz_session_id": str(session["quiz_session_id"]),
            "scenarios": scenarios,
            "actions": actions,
            "action_risk_score": session["action_risk_score"],
            "calibrated_risk_score": session["calibrated_risk_score"],
            "gap_type": session["gap_type"],
            "analysis": analysis,
            "created_at": session["created_at"].isoformat()
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"시뮬레이션 세션 조회 실패: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"세션 조회 중 오류 발생: {str(e)}"
        )


@router.get("/{session_id}/chart/{scenario_key}")
async def get_scenario_chart(session_id: UUID, scenario_key: str):
    """시나리오 차트 데이터 조회"""
    try:
        pool = get_pool()

        async with pool.acquire() as conn:
            session = await conn.fetchrow(
                "SELECT scenarios FROM simulation_sessions WHERE id = $1",
                session_id
            )

            if not session:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="시뮬레이션 세션을 찾을 수 없습니다."
                )

        scenario_keys = json.loads(session["scenarios"])
        if scenario_key not in scenario_keys:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="요청한 시나리오가 세션에 없습니다."
            )

        scenario = simulation_engine.get_scenario_by_key(scenario_key)
        if not scenario:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"시나리오를 찾을 수 없습니다: {scenario_key}"
            )

        chart_data = await asyncio.to_thread(
            simulation_engine.get_scenario_chart_data,
            scenario["ticker"],
            scenario["chart_start"],
            scenario["chart_end"],
            scenario.get("context")
        )

        logger.info(
            f"차트 데이터 조회: session={session_id}, scenario={scenario_key}, "
            f"data_points={len(chart_data)}"
        )

        return {
            "session_id": str(session_id),
            "scenario_key": scenario_key,
            "ticker": scenario["ticker"],
            "chart_start": scenario["chart_start"],
            "chart_end": scenario["chart_end"],
            "data": chart_data
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"차트 데이터 조회 실패: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"차트 데이터 조회 중 오류 발생: {str(e)}"
        )
