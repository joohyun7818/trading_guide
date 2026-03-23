"""
AlphaFlow US v2 - 전략 매퍼
위험 성향 점수를 투자 전략으로 매핑
"""
import logging
from typing import Dict

logger = logging.getLogger(__name__)

# ==================== 기본 전략 프로필 ====================

STRATEGY_PROFILES = {
    "ultra_safe": {
        "strategy_key": "ultra_safe",
        "name": "안전제일 거북이 🐢",
        "description": "원금 보호를 최우선으로 하는 초보수적 전략",
        "risk_range": (0, 20),
        "asset_allocation": {
            "stocks": 0.20,
            "bonds": 0.60,
            "cash": 0.20
        },
        "equity_detail": {
            "sector_weights": {
                "SPY": 0.50,   # S&P 500
                "XLP": 0.25,   # Consumer Staples (필수소비재)
                "XLU": 0.25    # Utilities (유틸리티)
            },
            "leverage_allowed": False,
            "macro_weight": 0.1
        },
        "rebalance_frequency": "yearly",
        "max_drawdown_tolerance": 0.05,
        "character": {
            "emoji": "🐢",
            "color": "#4CAF50",
            "personality": "느리지만 꾸준한 거북이처럼 안전하게"
        }
    },
    "conservative": {
        "strategy_key": "conservative",
        "name": "신중한 부엉이 🦉",
        "description": "안정성을 중시하되 완만한 성장을 추구하는 보수적 전략",
        "risk_range": (21, 40),
        "asset_allocation": {
            "stocks": 0.40,
            "bonds": 0.45,
            "cash": 0.15
        },
        "equity_detail": {
            "sector_weights": {
                "SPY": 0.60,   # S&P 500
                "XLV": 0.20,   # Healthcare
                "XLP": 0.20    # Consumer Staples
            },
            "leverage_allowed": False,
            "macro_weight": 0.15
        },
        "rebalance_frequency": "quarterly",
        "max_drawdown_tolerance": 0.10,
        "character": {
            "emoji": "🦉",
            "color": "#2196F3",
            "personality": "지혜롭고 신중하게 판단"
        }
    },
    "balanced": {
        "strategy_key": "balanced",
        "name": "균형잡힌 여우 🦊",
        "description": "위험과 수익의 균형을 맞추는 중도 전략",
        "risk_range": (41, 60),
        "asset_allocation": {
            "stocks": 0.60,
            "bonds": 0.30,
            "cash": 0.10
        },
        "equity_detail": {
            "sector_weights": {
                "SPY": 0.40,   # S&P 500
                "QQQ": 0.30,   # Nasdaq 100
                "XLF": 0.15,   # Financial
                "XLV": 0.15    # Healthcare
            },
            "leverage_allowed": False,
            "macro_weight": 0.20
        },
        "rebalance_frequency": "quarterly",
        "max_drawdown_tolerance": 0.20,
        "character": {
            "emoji": "🦊",
            "color": "#FF9800",
            "personality": "영리하고 유연하게 대응"
        }
    },
    "aggressive": {
        "strategy_key": "aggressive",
        "name": "공격적인 사자 🦁",
        "description": "높은 수익을 위해 적극적으로 위험을 감수하는 전략",
        "risk_range": (61, 80),
        "asset_allocation": {
            "stocks": 0.80,
            "bonds": 0.15,
            "cash": 0.05
        },
        "equity_detail": {
            "sector_weights": {
                "QQQ": 0.50,   # Nasdaq 100
                "XLK": 0.20,   # Technology
                "XLY": 0.15,   # Consumer Discretionary
                "XLI": 0.15    # Industrial
            },
            "leverage_allowed": True,
            "macro_weight": 0.25
        },
        "rebalance_frequency": "monthly",
        "max_drawdown_tolerance": 0.30,
        "character": {
            "emoji": "🦁",
            "color": "#F44336",
            "personality": "용맹하고 과감한 공격"
        }
    },
    "yolo": {
        "strategy_key": "yolo",
        "name": "달나라 고양이 🐱",
        "description": "최대 수익을 위해 극단적 위험을 감수하는 초공격적 전략",
        "risk_range": (81, 100),
        "asset_allocation": {
            "stocks": 0.95,
            "bonds": 0.05,
            "cash": 0.00
        },
        "equity_detail": {
            "sector_weights": {
                "QQQ": 0.60,   # Nasdaq 100
                "XLK": 0.40    # Technology
            },
            "leverage_allowed": True,
            "macro_weight": 0.30
        },
        "rebalance_frequency": "monthly",
        "max_drawdown_tolerance": 0.50,
        "character": {
            "emoji": "🐱",
            "color": "#9C27B0",
            "personality": "To the moon! 🚀"
        }
    }
}


# ==================== 함수 ====================

def map_strategy(risk_score: int) -> Dict:
    """위험 점수를 전략으로 매핑

    Args:
        risk_score: 위험 성향 점수 (0~100)

    Returns:
        Dict: 전략 프로필
    """
    for strategy_key, profile in STRATEGY_PROFILES.items():
        risk_min, risk_max = profile["risk_range"]
        if risk_min <= risk_score <= risk_max:
            logger.info(f"전략 매핑: risk_score={risk_score} -> {strategy_key}")
            return profile.copy()

    # 기본값 (균형)
    logger.warning(f"전략 매핑 실패: risk_score={risk_score}, 기본값 사용")
    return STRATEGY_PROFILES["balanced"].copy()


def customize_strategy(base_strategy: Dict, advanced_answers: Dict[str, int]) -> Dict:
    """고급 질문 답변을 반영하여 전략 커스터마이즈

    Args:
        base_strategy: 기본 전략 프로필
        advanced_answers: Q6~Q10 답변

    Returns:
        Dict: 커스터마이즈된 전략
    """
    strategy = base_strategy.copy()

    # Q6: 섹터 선호도
    if "Q6" in advanced_answers:
        from api.services.quiz_engine import ADVANCED_QUESTIONS
        q6_options = ADVANCED_QUESTIONS["Q6"]["options"]
        selected_option = next(
            (opt for opt in q6_options if opt.get("value") == advanced_answers["Q6"]),
            None
        )
        if selected_option and selected_option.get("weight"):
            # 섹터 가중치 오버라이드
            sector_weights = selected_option["weight"]
            if sector_weights:  # 분산투자가 아닌 경우
                strategy["equity_detail"]["sector_weights"] = sector_weights
                logger.info(f"섹터 가중치 커스터마이즈: {sector_weights}")

    # Q7: 최대 허용 MDD
    if "Q7" in advanced_answers:
        from api.services.quiz_engine import ADVANCED_QUESTIONS
        q7_options = ADVANCED_QUESTIONS["Q7"]["options"]
        selected_option = next(
            (opt for opt in q7_options if opt.get("value") == advanced_answers["Q7"]),
            None
        )
        if selected_option and "mdd" in selected_option:
            strategy["max_drawdown_tolerance"] = selected_option["mdd"]
            logger.info(f"MDD 커스터마이즈: {selected_option['mdd']}")

    # Q8: 리밸런싱 주기
    if "Q8" in advanced_answers:
        from api.services.quiz_engine import ADVANCED_QUESTIONS
        q8_options = ADVANCED_QUESTIONS["Q8"]["options"]
        selected_option = next(
            (opt for opt in q8_options if opt.get("value") == advanced_answers["Q8"]),
            None
        )
        if selected_option and "frequency" in selected_option:
            strategy["rebalance_frequency"] = selected_option["frequency"]
            logger.info(f"리밸런싱 주기 커스터마이즈: {selected_option['frequency']}")

    # Q9: 레버리지 사용
    if "Q9" in advanced_answers:
        from api.services.quiz_engine import ADVANCED_QUESTIONS
        q9_options = ADVANCED_QUESTIONS["Q9"]["options"]
        selected_option = next(
            (opt for opt in q9_options if opt.get("value") == advanced_answers["Q9"]),
            None
        )
        if selected_option and "leverage" in selected_option:
            strategy["equity_detail"]["leverage_allowed"] = selected_option["leverage"]
            logger.info(f"레버리지 설정 커스터마이즈: {selected_option['leverage']}")

    # Q10: 매크로 가중치
    if "Q10" in advanced_answers:
        from api.services.quiz_engine import ADVANCED_QUESTIONS
        q10_options = ADVANCED_QUESTIONS["Q10"]["options"]
        selected_option = next(
            (opt for opt in q10_options if opt.get("value") == advanced_answers["Q10"]),
            None
        )
        if selected_option and "macro_weight" in selected_option:
            strategy["equity_detail"]["macro_weight"] = selected_option["macro_weight"]
            logger.info(f"매크로 가중치 커스터마이즈: {selected_option['macro_weight']}")

    return strategy


def get_strategy_character(strategy_key: str) -> Dict:
    """전략 캐릭터 정보 반환

    Args:
        strategy_key: 전략 키

    Returns:
        Dict: 캐릭터 정보 (이름, 이모지, 설명, 색상)
    """
    if strategy_key in STRATEGY_PROFILES:
        profile = STRATEGY_PROFILES[strategy_key]
        return {
            "name": profile["name"],
            "emoji": profile["character"]["emoji"],
            "description": profile["description"],
            "color": profile["character"]["color"],
            "personality": profile["character"]["personality"]
        }

    # 기본값
    return {
        "name": "알 수 없음",
        "emoji": "❓",
        "description": "전략을 찾을 수 없습니다.",
        "color": "#9E9E9E",
        "personality": ""
    }
