"""
AlphaFlow US v2 - 행동 보정 (Calibrator)
퀴즈 기반 위험 점수와 실제 행동 점수의 차이를 분석하여 보정
"""
import logging
from typing import Dict, Tuple

logger = logging.getLogger(__name__)

# ==================== 점수 차이 분석 ====================

def calculate_action_risk_score(actions: Dict[str, str], scenarios: list) -> int:
    """실제 행동 기반 위험 점수 계산

    Args:
        actions: {scenario_key: action} 형태의 행동 딕셔너리
        scenarios: 사용된 시나리오 목록

    Returns:
        int: 행동 기반 위험 점수 (0~100)
    """
    if not actions:
        return 50  # 기본값

    from api.services.simulation_engine import calculate_action_score

    total_score = 0
    count = 0

    for scenario in scenarios:
        scenario_key = scenario["key"]
        if scenario_key in actions:
            action = actions[scenario_key]
            action_score = calculate_action_score(scenario_key, action)
            total_score += action_score
            count += 1

    if count == 0:
        return 50

    # 1~5점을 0~100 스케일로 변환
    avg_score = total_score / count
    action_risk_score = int((avg_score - 1) / 4 * 100)
    action_risk_score = max(0, min(100, action_risk_score))

    logger.info(f"행동 위험 점수: {action_risk_score} (평균 행동 점수: {avg_score:.2f})")
    return action_risk_score


def calibrate_risk_score(
    quiz_risk_score: int,
    action_risk_score: int
) -> Tuple[int, str]:
    """퀴즈 점수와 행동 점수를 비교하여 보정된 점수 계산

    Args:
        quiz_risk_score: 퀴즈 기반 위험 점수 (0~100)
        action_risk_score: 행동 기반 위험 점수 (0~100)

    Returns:
        Tuple[int, str]: (보정된 위험 점수, gap_type)
    """
    gap = action_risk_score - quiz_risk_score

    # Gap Type 결정
    if abs(gap) <= 10:
        gap_type = "aligned"  # 일치
        weight_quiz = 0.7
        weight_action = 0.3
    elif gap > 10:
        if gap > 30:
            gap_type = "high_risk"  # 실제 행동이 훨씬 더 공격적
            weight_quiz = 0.4
            weight_action = 0.6
        else:
            gap_type = "moderate_high"  # 실제 행동이 더 공격적
            weight_quiz = 0.5
            weight_action = 0.5
    else:  # gap < -10
        if gap < -30:
            gap_type = "low_risk"  # 실제 행동이 훨씬 더 보수적
            weight_quiz = 0.4
            weight_action = 0.6
        else:
            gap_type = "moderate_low"  # 실제 행동이 더 보수적
            weight_quiz = 0.5
            weight_action = 0.5

    # 가중 평균으로 보정된 점수 계산
    calibrated_score = int(
        quiz_risk_score * weight_quiz + action_risk_score * weight_action
    )
    calibrated_score = max(0, min(100, calibrated_score))

    logger.info(
        f"점수 보정: quiz={quiz_risk_score}, action={action_risk_score}, "
        f"gap={gap}, type={gap_type}, calibrated={calibrated_score}"
    )

    return calibrated_score, gap_type


def get_gap_message(gap_type: str, quiz_risk_score: int, calibrated_score: int) -> str:
    """Gap Type에 따른 메시지 생성

    Args:
        gap_type: Gap 유형
        quiz_risk_score: 퀴즈 기반 점수
        calibrated_score: 보정된 점수

    Returns:
        str: 사용자 메시지
    """
    messages = {
        "aligned": (
            f"퀴즈 결과({quiz_risk_score}점)와 실제 행동({calibrated_score}점)이 일치합니다! "
            "말과 행동이 일치하는 투자자시네요. 👍"
        ),
        "moderate_high": (
            f"퀴즈에서는 {quiz_risk_score}점이었지만, 실제로는 더 공격적으로 행동하셨어요. "
            f"보정된 점수는 {calibrated_score}점입니다. "
            "실제 위험 감수 성향이 생각보다 높은 편이네요! 🚀"
        ),
        "high_risk": (
            f"퀴즈 점수({quiz_risk_score}점)보다 훨씬 더 공격적인 행동을 보이셨네요! "
            f"보정 점수는 {calibrated_score}점입니다. "
            "실제로는 고위험을 감수할 준비가 되어 있는 투자자입니다. ⚡"
        ),
        "moderate_low": (
            f"퀴즈에서는 {quiz_risk_score}점이었지만, 실제로는 더 신중하게 행동하셨어요. "
            f"보정된 점수는 {calibrated_score}점입니다. "
            "안전을 중시하는 성향이 강하네요. 🛡️"
        ),
        "low_risk": (
            f"퀴즈 점수({quiz_risk_score}점)보다 훨씬 더 보수적인 행동을 보이셨네요! "
            f"보정 점수는 {calibrated_score}점입니다. "
            "실제로는 원금 보호를 최우선으로 하는 투자자입니다. 🐢"
        )
    }

    return messages.get(
        gap_type,
        f"점수가 {quiz_risk_score}점에서 {calibrated_score}점으로 보정되었습니다."
    )


def analyze_scenario_performance(actions: Dict[str, str], scenarios: list) -> Dict:
    """시나리오별 행동 분석

    Args:
        actions: {scenario_key: action} 행동 딕셔너리
        scenarios: 시나리오 목록

    Returns:
        Dict: 분석 결과
    """
    from api.services.simulation_engine import get_scenario_by_key

    analysis = {
        "total": len(scenarios),
        "answered": len(actions),
        "by_market_type": {
            "up": {"buy": 0, "hold": 0, "sell": 0},
            "down": {"buy": 0, "hold": 0, "sell": 0},
            "mixed": {"buy": 0, "hold": 0, "sell": 0}
        },
        "correct_timing": 0,  # 좋은 타이밍에 매수한 횟수
        "panic_sell": 0,      # 패닉 매도 횟수
        "fomo_buy": 0         # FOMO 매수 횟수
    }

    for scenario in scenarios:
        scenario_key = scenario["key"]
        if scenario_key not in actions:
            continue

        action = actions[scenario_key]
        market_type = scenario.get("market_type", "mixed")

        # 시장 유형별 행동 집계
        if market_type in analysis["by_market_type"]:
            analysis["by_market_type"][market_type][action] = \
                analysis["by_market_type"][market_type].get(action, 0) + 1

        # 특정 패턴 감지
        action_score = scenario["action_scores"].get(action, 3)

        if action == "buy" and action_score >= 4:
            analysis["correct_timing"] += 1
        elif action == "sell" and market_type == "down" and action_score <= 2:
            analysis["panic_sell"] += 1
        elif action == "buy" and market_type == "up" and action_score <= 2:
            analysis["fomo_buy"] += 1

    logger.info(f"시나리오 분석 완료: {analysis}")
    return analysis
