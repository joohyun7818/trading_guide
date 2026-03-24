"""
AlphaFlow US v2 - 퀴즈 엔진
투자 성향 퀴즈 질문 정의 및 점수 계산
"""
import logging
from typing import Dict, List

logger = logging.getLogger(__name__)

# ==================== 기본 질문 (Q1~Q5) ====================

BASIC_QUESTIONS = {
    "Q1": {
        "id": "Q1",
        "text": "투자의 주요 목적은 무엇인가요?",
        "options": [
            {"value": 1, "label": "노후 대비 안정적인 자산 보존"},
            {"value": 2, "label": "은퇴 후 생활비를 위한 자산 보존"},
            {"value": 3, "label": "완만한 자산 성장"},
            {"value": 4, "label": "적극적인 자산 성장"},
            {"value": 5, "label": "단기간에 높은 수익 추구"}
        ]
    },
    "Q2": {
        "id": "Q2",
        "text": "투자 기간은 얼마나 되나요?",
        "options": [
            {"value": 5, "label": "6개월 미만"},
            {"value": 4, "label": "1년"},
            {"value": 3, "label": "3년"},
            {"value": 2, "label": "5년 이상"},
            {"value": 1, "label": "10년 이상"}
        ]
    },
    "Q3": {
        "id": "Q3",
        "text": "원금 손실을 얼마나 허용할 수 있나요?",
        "options": [
            {"value": 1, "label": "절대 손실 불가 (원금 보장 필수)"},
            {"value": 2, "label": "최대 5%까지"},
            {"value": 3, "label": "최대 15%까지"},
            {"value": 4, "label": "최대 30%까지"},
            {"value": 5, "label": "50% 이상도 감수 가능"}
        ]
    },
    "Q4": {
        "id": "Q4",
        "text": "투자 경험은 어느 정도인가요?",
        "options": [
            {"value": 1, "label": "전혀 없음"},
            {"value": 2, "label": "예적금만 해봄"},
            {"value": 3, "label": "펀드 투자 경험"},
            {"value": 4, "label": "직접 주식 거래 경험"},
            {"value": 5, "label": "파생상품/레버리지 경험"}
        ]
    },
    "Q5": {
        "id": "Q5",
        "text": "수익률과 안정성 중 무엇을 우선시하나요?",
        "options": [
            {"value": 1, "label": "안정성 최우선 (변동성 최소화)"},
            {"value": 2, "label": "안정성 중시"},
            {"value": 3, "label": "균형 (둘 다 중요)"},
            {"value": 4, "label": "수익률 중시"},
            {"value": 5, "label": "수익률 최우선 (고위험 감수)"}
        ]
    }
}

# ==================== 용어 체크 (T1~T5) ====================

TERM_QUESTIONS = {
    "T1": {
        "id": "T1",
        "term": "MDD (최대낙폭, Maximum Drawdown)",
        "description": "투자 기간 동안 발생한 최대 손실률"
    },
    "T2": {
        "id": "T2",
        "term": "샤프 비율 (Sharpe Ratio)",
        "description": "위험 대비 수익률을 나타내는 지표"
    },
    "T3": {
        "id": "T3",
        "term": "리밸런싱 (Rebalancing)",
        "description": "목표 자산 배분 비율을 유지하기 위해 주기적으로 조정하는 것"
    },
    "T4": {
        "id": "T4",
        "term": "섹터 로테이션 (Sector Rotation)",
        "description": "경기 사이클에 따라 유망 섹터에 투자하는 전략"
    },
    "T5": {
        "id": "T5",
        "term": "레버리지 ETF (Leveraged ETF)",
        "description": "기초 지수 수익률의 2~3배를 추종하는 ETF"
    }
}

# ==================== 고급 질문 (Q6~Q10) ====================

ADVANCED_QUESTIONS = {
    "Q6": {
        "id": "Q6",
        "text": "선호하는 섹터가 있나요?",
        "options": [
            {"value": "tech", "label": "기술주 (애플, MS, 엔비디아 등)", "weight": {"XLK": 0.4, "QQQ": 0.3}},
            {"value": "healthcare", "label": "헬스케어 (화이자, 존슨앤존슨 등)", "weight": {"XLV": 0.5}},
            {"value": "finance", "label": "금융 (JP모건, 뱅크오브아메리카 등)", "weight": {"XLF": 0.5}},
            {"value": "energy", "label": "에너지 (엑슨모빌, 셰브론 등)", "weight": {"XLE": 0.5}},
            {"value": "diversified", "label": "분산 투자 (모든 섹터 균형)", "weight": {}}
        ]
    },
    "Q7": {
        "id": "Q7",
        "text": "최대 허용 MDD는 얼마인가요?",
        "options": [
            {"value": 1, "label": "5% (매우 보수적)", "mdd": 0.05},
            {"value": 2, "label": "10% (보수적)", "mdd": 0.10},
            {"value": 3, "label": "20% (적정)", "mdd": 0.20},
            {"value": 4, "label": "30% (공격적)", "mdd": 0.30},
            {"value": 5, "label": "상관없음 (초공격적)", "mdd": 0.50}
        ]
    },
    "Q8": {
        "id": "Q8",
        "text": "리밸런싱 주기는 어떻게 하시겠습니까?",
        "options": [
            {"value": 5, "label": "매주", "frequency": "weekly"},
            {"value": 4, "label": "매월", "frequency": "monthly"},
            {"value": 3, "label": "분기", "frequency": "quarterly"},
            {"value": 2, "label": "반기", "frequency": "semi_annually"},
            {"value": 1, "label": "매년", "frequency": "yearly"}
        ]
    },
    "Q9": {
        "id": "Q9",
        "text": "레버리지 사용 의향은 어떠신가요?",
        "options": [
            {"value": 1, "label": "절대 불가", "leverage": False},
            {"value": 2, "label": "소극적 (전체의 5% 이하)", "leverage": True},
            {"value": 3, "label": "보통 (10% 정도)", "leverage": True},
            {"value": 4, "label": "적극적 (20% 이상)", "leverage": True},
            {"value": 5, "label": "올인 (50% 이상)", "leverage": True}
        ]
    },
    "Q10": {
        "id": "Q10",
        "text": "매크로 지표(금리, 인플레이션 등)를 얼마나 반영하시겠습니까?",
        "options": [
            {"value": 1, "label": "무시 (Buy & Hold)", "macro_weight": 0.0},
            {"value": 2, "label": "약간 참고", "macro_weight": 0.1},
            {"value": 3, "label": "보통", "macro_weight": 0.2},
            {"value": 4, "label": "적극 반영", "macro_weight": 0.3},
            {"value": 5, "label": "매크로 중심 전략", "macro_weight": 0.5}
        ]
    }
}

# ==================== 질문 가중치 ====================

QUESTION_WEIGHTS = {
    "Q1": 0.20,  # 투자 목적
    "Q2": 0.15,  # 투자 기간
    "Q3": 0.25,  # 손실 허용
    "Q4": 0.15,  # 투자 경험
    "Q5": 0.25   # 수익률 vs 안정성
}


# ==================== 함수 ====================

def get_basic_questions() -> List[Dict]:
    """기본 질문 (Q1~Q5) 반환"""
    return list(BASIC_QUESTIONS.values())


def get_term_questions() -> List[Dict]:
    """용어 질문 (T1~T5) 반환"""
    return list(TERM_QUESTIONS.values())


def get_advanced_questions() -> List[Dict]:
    """고급 질문 (Q6~Q10) 반환"""
    return list(ADVANCED_QUESTIONS.values())


def calculate_risk_score(answers: Dict[str, int]) -> int:
    """위험 성향 점수 계산 (0~100)

    Args:
        answers: Q1~Q5 답변 딕셔너리 {question_id: score}

    Returns:
        int: 위험 성향 점수 (0~100)
    """
    if not answers:
        return 50  # 기본값

    weighted_sum = 0.0

    for qid, weight in QUESTION_WEIGHTS.items():
        if qid in answers:
            # 1~5점을 0~100 스케일로 변환
            score = answers[qid]
            normalized = (score - 1) / 4 * 100  # 1->0, 5->100
            weighted_sum += normalized * weight

    risk_score = int(round(weighted_sum))
    risk_score = max(0, min(100, risk_score))  # 0~100 범위로 제한

    logger.info(f"위험 점수 계산: answers={answers}, risk_score={risk_score}")
    return risk_score


def determine_expertise(term_answers: Dict[str, bool]) -> str:
    """전문성 수준 결정

    Args:
        term_answers: T1~T5 답변 딕셔너리 {term_id: knows}

    Returns:
        str: 'beginner', 'intermediate', 'advanced'
    """
    if not term_answers:
        return "beginner"

    known_count = sum(1 for knows in term_answers.values() if knows)

    if known_count <= 1:
        level = "beginner"
    elif known_count <= 3:
        level = "intermediate"
    else:
        level = "advanced"

    logger.info(f"전문성 수준: known_count={known_count}, level={level}")
    return level


def should_show_advanced(term_answers: Dict[str, bool]) -> bool:
    """고급 질문 표시 여부

    Args:
        term_answers: T1~T5 답변 딕셔너리

    Returns:
        bool: 고급 질문 표시 여부 (3개 이상 "안다"면 True)
    """
    if not term_answers:
        return False

    known_count = sum(1 for knows in term_answers.values() if knows)
    show_advanced = known_count >= 3

    logger.info(f"고급 질문 표시 여부: known_count={known_count}, show={show_advanced}")
    return show_advanced
