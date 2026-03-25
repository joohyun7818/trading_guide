"""
AlphaFlow US v2 - 행동 보정 (Calibrator)
퀴즈 기반 위험 점수와 실제 행동 점수의 차이를 분석하여 보정
"""
import logging
from typing import Dict, List

from api.services import simulation_engine

logger = logging.getLogger(__name__)


def _weight_for_market_type(market_type: str) -> float:
    """하락장 가중치 1.5배, 그 외 1.0배"""
    return 1.5 if market_type == "down" else 1.0


def _resolve_action_score(action_entry: Dict) -> int:
    """액션 엔트리에 action_score가 없으면 시나리오 정의로부터 계산"""
    if "action_score" in action_entry and action_entry["action_score"] is not None:
        return int(action_entry["action_score"])
    return simulation_engine.calculate_action_score(
        action_entry.get("scenario_key", ""),
        action_entry.get("action", "")
    )


def calculate_action_risk_score(actions: List[Dict]) -> int:
    """실제 행동 기반 위험 점수 계산 (0~100)

    - 시나리오별 action_score 가중 평균 × 20
    - 하락장 시나리오는 가중치 1.5배
    """
    if not actions:
        return 50

    total_weighted_score = 0.0
    total_weight = 0.0

    for action_entry in actions:
        scenario_key = action_entry.get("scenario_key", "")
        scenario = simulation_engine.get_scenario_by_key(scenario_key)
        market_type = action_entry.get("market_type") or scenario.get("market_type", "mixed")
        weight = _weight_for_market_type(market_type)
        action_score = _resolve_action_score(action_entry)

        total_weighted_score += action_score * weight
        total_weight += weight

    if total_weight == 0:
        return 50

    avg_action_score = total_weighted_score / total_weight
    action_risk_score = int(round(avg_action_score * 20))
    action_risk_score = max(0, min(100, action_risk_score))

    logger.info(
        f"행동 위험 점수 계산: actions={len(actions)}, "
        f"avg_score={avg_action_score:.2f}, risk={action_risk_score}"
    )
    return action_risk_score


def determine_gap_type(gap: int) -> str:
    """갭 크기에 따른 유형 결정"""
    if gap > 15:
        return "overconfident"
    if gap < -15:
        return "underconfident"
    return "consistent"


def build_gap_message(gap_type: str, gap: int, quiz_risk_score: int, calibrated_score: int) -> str:
    """Gap 유형별 피드백 메시지 생성"""
    if gap_type == "overconfident":
        return (
            f"퀴즈 점수({quiz_risk_score}점)보다 실제 행동이 {gap}p 더 공격적이에요. "
            f"위험 선호가 높으니 손익 관리 규칙을 명확히 설정해 보세요. "
            f"보정된 위험 점수는 {calibrated_score}점입니다."
        )
    if gap_type == "underconfident":
        return (
            f"퀴즈 점수({quiz_risk_score}점)보다 실제 행동이 {abs(gap)}p 더 보수적이에요. "
            f"시장 하락 시 과도한 공포 매도를 피하고 장기 플랜을 점검해 보세요. "
            f"보정된 위험 점수는 {calibrated_score}점입니다."
        )
    return (
        f"퀴즈 점수({quiz_risk_score}점)와 실제 행동이 잘 일치합니다. "
        f"현재 리스크 관리 방식을 유지하셔도 좋겠습니다. "
        f"보정된 위험 점수는 {calibrated_score}점입니다."
    )


def calibrate(quiz_risk_score: int, actions: List[Dict]) -> Dict:
    """퀴즈 점수와 행동 데이터로 보정 결과 계산

    Returns:
        dict: {action_risk_score, calibrated_risk_score, gap_type, gap, message}
    """
    action_risk_score = calculate_action_risk_score(actions)
    gap = action_risk_score - quiz_risk_score
    gap_type = determine_gap_type(gap)
    calibrated_risk_score = int(round(quiz_risk_score * 0.4 + action_risk_score * 0.6))
    calibrated_risk_score = max(0, min(100, calibrated_risk_score))

    message = build_gap_message(gap_type, gap, quiz_risk_score, calibrated_risk_score)

    logger.info(
        f"점수 보정 완료: quiz={quiz_risk_score}, action={action_risk_score}, "
        f"gap={gap}, type={gap_type}, calibrated={calibrated_risk_score}"
    )

    return {
        "action_risk_score": action_risk_score,
        "calibrated_risk_score": calibrated_risk_score,
        "gap_type": gap_type,
        "gap": gap,
        "message": message
    }


def analyze_scenario_performance(actions: List[Dict]) -> Dict:
    """시나리오별 행동 분석"""
    analysis = {
        "total": len(actions),
        "answered": len(actions),
        "by_market_type": {
            "up": {"buy": 0, "hold": 0, "sell": 0},
            "down": {"buy": 0, "hold": 0, "sell": 0},
            "mixed": {"buy": 0, "hold": 0, "sell": 0}
        },
        "correct_timing": 0,
        "panic_sell": 0,
        "fomo_buy": 0
    }

    for entry in actions:
        scenario = simulation_engine.get_scenario_by_key(entry.get("scenario_key", ""))
        action = entry.get("action")
        market_type = entry.get("market_type") or scenario.get("market_type", "mixed")

        if market_type in analysis["by_market_type"] and action in analysis["by_market_type"][market_type]:
            analysis["by_market_type"][market_type][action] += 1

        action_score = scenario.get("action_scores", {}).get(action, 3)
        if action == "buy" and action_score >= 4:
            analysis["correct_timing"] += 1
        elif action == "sell" and market_type == "down" and action_score <= 2:
            analysis["panic_sell"] += 1
        elif action == "buy" and market_type == "up" and action_score <= 2:
            analysis["fomo_buy"] += 1

    logger.info(f"시나리오 행동 분석: {analysis}")
    return analysis
