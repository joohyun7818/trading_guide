"""
전략 매핑: risk_score를 기반으로 투자 전략 프로필을 매핑

risk_score(0~100)에 따라 5가지 전략 프로필 중 하나를 선택하고,
고급 질문 답변으로 세부 설정을 커스터마이징한다.
"""
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

# ============================================================
# 전략 프로필 정의
# ============================================================

STRATEGY_PROFILES = {
    "ultra_safe": {
        "strategy_key": "ultra_safe",
        "name": "안전제일 거북이",
        "emoji": "🐢",
        "color": "#4CAF50",
        "description": "원금 보존을 최우선으로 하는 초보수적 전략",
        "risk_range": (0, 20),
        "allocation": {
            "stocks": 20,
            "bonds": 60,
            "cash": 20,
        },
        "rebalance_frequency": "yearly",
        "max_drawdown_tolerance": 5,
        "expected_annual_return": "3-5%",
        "volatility": "매우 낮음",
    },
    "conservative": {
        "strategy_key": "conservative",
        "name": "신중한 부엉이",
        "emoji": "🦉",
        "color": "#2196F3",
        "description": "안정성을 중시하면서 완만한 성장을 추구하는 보수적 전략",
        "risk_range": (21, 40),
        "allocation": {
            "stocks": 40,
            "bonds": 45,
            "cash": 15,
        },
        "rebalance_frequency": "quarterly",
        "max_drawdown_tolerance": 10,
        "expected_annual_return": "5-8%",
        "volatility": "낮음",
    },
    "balanced": {
        "strategy_key": "balanced",
        "name": "균형잡힌 여우",
        "emoji": "🦊",
        "color": "#FF9800",
        "description": "수익과 안정성의 균형을 추구하는 중도 전략",
        "risk_range": (41, 60),
        "allocation": {
            "stocks": 60,
            "bonds": 30,
            "cash": 10,
        },
        "rebalance_frequency": "quarterly",
        "max_drawdown_tolerance": 20,
        "expected_annual_return": "8-12%",
        "volatility": "보통",
    },
    "aggressive": {
        "strategy_key": "aggressive",
        "name": "공격적인 사자",
        "emoji": "🦁",
        "color": "#FF5722",
        "description": "적극적인 성장을 추구하는 공격적 전략",
        "risk_range": (61, 80),
        "allocation": {
            "stocks": 80,
            "bonds": 15,
            "cash": 5,
        },
        "rebalance_frequency": "monthly",
        "max_drawdown_tolerance": 30,
        "expected_annual_return": "12-18%",
        "volatility": "높음",
    },
    "yolo": {
        "strategy_key": "yolo",
        "name": "달나라 고양이",
        "emoji": "🚀",
        "color": "#9C27B0",
        "description": "최대 수익을 위한 초공격적 전략",
        "risk_range": (81, 100),
        "allocation": {
            "stocks": 95,
            "bonds": 5,
            "cash": 0,
        },
        "rebalance_frequency": "monthly",
        "max_drawdown_tolerance": 50,
        "expected_annual_return": "18%+",
        "volatility": "매우 높음",
    },
}


# ============================================================
# 전략 매핑 함수
# ============================================================


def map_strategy(risk_score: int) -> Dict[str, Any]:
    """
    risk_score(0~100)를 기반으로 기본 전략 프로필을 매핑한다.

    Args:
        risk_score: 0~100 사이의 위험 점수

    Returns:
        전략 프로필 dict
    """
    for strategy_key, profile in STRATEGY_PROFILES.items():
        min_score, max_score = profile["risk_range"]
        if min_score <= risk_score <= max_score:
            logger.info(f"Mapped risk_score {risk_score} to strategy: {strategy_key}")
            return profile.copy()

    # 범위 밖이면 기본값
    logger.warning(f"risk_score {risk_score} out of range, using balanced")
    return STRATEGY_PROFILES["balanced"].copy()


def customize_strategy(
    base_strategy: Dict[str, Any],
    advanced_answers: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    고급 질문 답변을 반영하여 전략을 커스터마이징한다.

    Args:
        base_strategy: map_strategy()로 얻은 기본 전략
        advanced_answers: {"Q6": "tech", "Q7": 3, ...} 형태

    Returns:
        커스터마이징된 전략 dict
    """
    if not advanced_answers:
        return base_strategy

    strategy = base_strategy.copy()

    # Q6: 선호 섹터 → equity_detail.sector_weights 조정
    if "Q6" in advanced_answers:
        sector_pref = advanced_answers["Q6"]
        sector_weights = _get_sector_weights(sector_pref)
        strategy["equity_detail"] = {
            "sector_weights": sector_weights,
            "sector_preference": sector_pref,
        }
        logger.info(f"Applied sector preference: {sector_pref}")

    # Q7: 최대 허용 MDD → max_drawdown_tolerance 오버라이드
    if "Q7" in advanced_answers:
        mdd_value = advanced_answers["Q7"]
        mdd_map = {1: 5, 2: 10, 3: 20, 4: 30, 5: 50}
        strategy["max_drawdown_tolerance"] = mdd_map.get(mdd_value, strategy["max_drawdown_tolerance"])
        logger.info(f"Applied MDD tolerance: {strategy['max_drawdown_tolerance']}%")

    # Q8: 리밸런싱 주기 → rebalance_frequency 오버라이드
    if "Q8" in advanced_answers:
        rebal_value = advanced_answers["Q8"]
        rebal_map = {5: "weekly", 4: "monthly", 3: "quarterly", 2: "semi_annually", 1: "yearly"}
        strategy["rebalance_frequency"] = rebal_map.get(rebal_value, strategy["rebalance_frequency"])
        logger.info(f"Applied rebalance frequency: {strategy['rebalance_frequency']}")

    # Q9: 레버리지 사용 → leverage_allowed 설정
    if "Q9" in advanced_answers:
        leverage_value = advanced_answers["Q9"]
        if leverage_value == 1:
            strategy["leverage_allowed"] = False
            strategy["leverage_level"] = 0
        elif leverage_value == 2:
            strategy["leverage_allowed"] = True
            strategy["leverage_level"] = 0.1  # 10%
        elif leverage_value == 3:
            strategy["leverage_allowed"] = True
            strategy["leverage_level"] = 0.25  # 25%
        elif leverage_value == 4:
            strategy["leverage_allowed"] = True
            strategy["leverage_level"] = 0.5  # 50%
        else:  # 5
            strategy["leverage_allowed"] = True
            strategy["leverage_level"] = 1.0  # 100%
        logger.info(f"Applied leverage: allowed={strategy['leverage_allowed']}, level={strategy.get('leverage_level', 0)}")

    # Q10: 매크로 지표 반영 → macro_weight 설정
    if "Q10" in advanced_answers:
        macro_value = advanced_answers["Q10"]
        macro_map = {1: 0.0, 2: 0.1, 3: 0.2, 4: 0.35, 5: 0.5}
        strategy["macro_weight"] = macro_map.get(macro_value, 0.15)
        logger.info(f"Applied macro weight: {strategy['macro_weight']}")

    return strategy


def get_strategy_character(strategy_key: str) -> Dict[str, str]:
    """
    전략 키로 캐릭터 정보(이름, 이모지, 설명, 색상)를 반환한다.

    Args:
        strategy_key: "ultra_safe" | "conservative" | "balanced" | "aggressive" | "yolo"

    Returns:
        {"name": "...", "emoji": "...", "description": "...", "color": "..."}
    """
    profile = STRATEGY_PROFILES.get(strategy_key)
    if not profile:
        logger.warning(f"Unknown strategy_key: {strategy_key}, using balanced")
        profile = STRATEGY_PROFILES["balanced"]

    return {
        "name": profile["name"],
        "emoji": profile["emoji"],
        "description": profile["description"],
        "color": profile["color"],
    }


# ============================================================
# 헬퍼 함수
# ============================================================


def _get_sector_weights(sector_pref: str) -> Dict[str, float]:
    """
    선호 섹터에 따라 섹터 가중치를 반환한다.

    Args:
        sector_pref: "tech" | "healthcare" | "financial" | "energy" | "diversified"

    Returns:
        {"Technology": 0.4, "Healthcare": 0.2, ...}
    """
    # 기본 균등 배분
    base_weights = {
        "Technology": 0.2,
        "Healthcare": 0.2,
        "Financial": 0.2,
        "Energy": 0.2,
        "Others": 0.2,
    }

    # 선호 섹터에 가중치 부여
    if sector_pref == "tech":
        return {
            "Technology": 0.4,
            "Healthcare": 0.15,
            "Financial": 0.15,
            "Energy": 0.15,
            "Others": 0.15,
        }
    elif sector_pref == "healthcare":
        return {
            "Technology": 0.15,
            "Healthcare": 0.4,
            "Financial": 0.15,
            "Energy": 0.15,
            "Others": 0.15,
        }
    elif sector_pref == "financial":
        return {
            "Technology": 0.15,
            "Healthcare": 0.15,
            "Financial": 0.4,
            "Energy": 0.15,
            "Others": 0.15,
        }
    elif sector_pref == "energy":
        return {
            "Technology": 0.15,
            "Healthcare": 0.15,
            "Financial": 0.15,
            "Energy": 0.4,
            "Others": 0.15,
        }
    else:  # diversified
        return base_weights
