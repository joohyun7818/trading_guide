"""
퀴즈 엔진: 투자 성향 평가 질문 정의 및 점수 계산

기본 질문(Q1~Q5), 용어 체크(T1~T5), 고급 질문(Q6~Q10)을 정의하고
risk_score와 expertise_level을 계산한다.
"""
import logging
from typing import Dict, List

logger = logging.getLogger(__name__)

# ============================================================
# 질문 데이터 정의
# ============================================================

QUESTIONS = {
    # 기본 질문 (Q1~Q5)
    "basic": [
        {
            "id": "Q1",
            "question": "투자 목적은 무엇인가요?",
            "type": "single_choice",
            "options": [
                {"value": 1, "label": "노후 대비 - 안정적인 자산 보존이 최우선"},
                {"value": 2, "label": "자산 보존 - 원금 손실을 최소화하고 싶음"},
                {"value": 3, "label": "완만한 성장 - 안정적이면서도 꾸준한 수익"},
                {"value": 4, "label": "적극적 성장 - 높은 수익을 추구"},
                {"value": 5, "label": "단기 고수익 - 빠른 시간 내 큰 수익 실현"},
            ],
            "weight": 0.20,
        },
        {
            "id": "Q2",
            "question": "투자 기간은 얼마나 되나요?",
            "type": "single_choice",
            "options": [
                {"value": 5, "label": "6개월 미만 - 단기 투자"},
                {"value": 4, "label": "1년 정도"},
                {"value": 3, "label": "3년 정도"},
                {"value": 2, "label": "5년 이상"},
                {"value": 1, "label": "10년 이상 - 장기 투자"},
            ],
            "weight": 0.15,
        },
        {
            "id": "Q3",
            "question": "원금 손실을 얼마나 허용할 수 있나요?",
            "type": "single_choice",
            "options": [
                {"value": 1, "label": "절대 불가 - 원금 손실은 받아들일 수 없음"},
                {"value": 2, "label": "5%까지 - 소폭 손실만 허용"},
                {"value": 3, "label": "15%까지 - 중간 수준의 손실 허용"},
                {"value": 4, "label": "30%까지 - 상당한 손실도 감수 가능"},
                {"value": 5, "label": "50% 이상 가능 - 고위험도 감수"},
            ],
            "weight": 0.25,
        },
        {
            "id": "Q4",
            "question": "투자 경험은 어느 정도인가요?",
            "type": "single_choice",
            "options": [
                {"value": 1, "label": "전혀 없음 - 투자 경험이 없음"},
                {"value": 2, "label": "예/적금만 - 은행 예적금만 이용"},
                {"value": 3, "label": "펀드 경험 - 간접 투자 경험"},
                {"value": 4, "label": "직접 주식 거래 - 주식 직접 투자 경험"},
                {"value": 5, "label": "파생상품 경험 - 옵션, 선물 등 경험"},
            ],
            "weight": 0.15,
        },
        {
            "id": "Q5",
            "question": "수익률과 안정성 중 무엇을 더 중요하게 생각하나요?",
            "type": "single_choice",
            "options": [
                {"value": 1, "label": "안정성 최우선 - 수익률보다 안정성"},
                {"value": 2, "label": "안정성 중시 - 안정성이 더 중요"},
                {"value": 3, "label": "균형 - 수익률과 안정성 균형"},
                {"value": 4, "label": "수익률 중시 - 수익률이 더 중요"},
                {"value": 5, "label": "수익률 최우선 - 안정성보다 수익률"},
            ],
            "weight": 0.25,
        },
    ],
    # 용어 체크 (T1~T5)
    "terms": [
        {
            "id": "T1",
            "term": "MDD (최대낙폭)",
            "description": "Maximum DrawDown - 투자 기간 중 최고점에서 최저점까지의 하락폭",
        },
        {
            "id": "T2",
            "term": "샤프 비율",
            "description": "Sharpe Ratio - 위험 대비 수익률을 나타내는 지표",
        },
        {
            "id": "T3",
            "term": "리밸런싱",
            "description": "Rebalancing - 포트폴리오의 자산 배분을 원래 비율로 조정하는 작업",
        },
        {
            "id": "T4",
            "term": "섹터 로테이션",
            "description": "Sector Rotation - 경기 사이클에 따라 유망 섹터로 자산을 이동하는 전략",
        },
        {
            "id": "T5",
            "term": "레버리지 ETF",
            "description": "Leveraged ETF - 기초 지수 변동의 2배 또는 3배 수익을 추구하는 상품",
        },
    ],
    # 고급 질문 (Q6~Q10)
    "advanced": [
        {
            "id": "Q6",
            "question": "어떤 섹터를 선호하시나요?",
            "type": "single_choice",
            "options": [
                {"value": "tech", "label": "기술주 (Technology)"},
                {"value": "healthcare", "label": "헬스케어 (Healthcare)"},
                {"value": "financial", "label": "금융 (Financial)"},
                {"value": "energy", "label": "에너지 (Energy)"},
                {"value": "diversified", "label": "분산 투자 (모든 섹터 균형)"},
            ],
        },
        {
            "id": "Q7",
            "question": "최대 허용 MDD(낙폭)는 얼마인가요?",
            "type": "single_choice",
            "options": [
                {"value": 1, "label": "5% - 매우 보수적"},
                {"value": 2, "label": "10% - 보수적"},
                {"value": 3, "label": "20% - 중립적"},
                {"value": 4, "label": "30% - 공격적"},
                {"value": 5, "label": "상관없음 - 수익만 나면 됨"},
            ],
        },
        {
            "id": "Q8",
            "question": "리밸런싱 주기는 어떻게 하시겠어요?",
            "type": "single_choice",
            "options": [
                {"value": 5, "label": "매주 - 시장 변화에 민감하게 대응"},
                {"value": 4, "label": "매월 - 적극적 관리"},
                {"value": 3, "label": "분기별 - 보통 수준"},
                {"value": 2, "label": "반기별 - 장기 투자"},
                {"value": 1, "label": "매년 - 매우 장기 투자"},
            ],
        },
        {
            "id": "Q9",
            "question": "레버리지 상품 사용에 대해 어떻게 생각하시나요?",
            "type": "single_choice",
            "options": [
                {"value": 1, "label": "절대 불가 - 레버리지는 위험함"},
                {"value": 2, "label": "소극적 - 최소한으로만"},
                {"value": 3, "label": "보통 - 상황에 따라"},
                {"value": 4, "label": "적극적 - 기회가 있으면 활용"},
                {"value": 5, "label": "올인 - 레버리지로 수익 극대화"},
            ],
        },
        {
            "id": "Q10",
            "question": "매크로 지표(금리, 경기 등)를 얼마나 반영하시겠어요?",
            "type": "single_choice",
            "options": [
                {"value": 1, "label": "무시 - 개별 종목만 봄"},
                {"value": 2, "label": "약간 참고 - 가끔 확인"},
                {"value": 3, "label": "보통 - 어느 정도 고려"},
                {"value": 4, "label": "적극 반영 - 중요하게 고려"},
                {"value": 5, "label": "매크로 중심 - 매크로가 가장 중요"},
            ],
        },
    ],
}


# ============================================================
# 질문 반환 함수
# ============================================================


def get_basic_questions() -> List[Dict]:
    """기본 질문(Q1~Q5)을 반환한다."""
    return QUESTIONS["basic"]


def get_term_questions() -> List[Dict]:
    """용어 체크(T1~T5)를 반환한다."""
    return QUESTIONS["terms"]


def get_advanced_questions() -> List[Dict]:
    """고급 질문(Q6~Q10)을 반환한다."""
    return QUESTIONS["advanced"]


# ============================================================
# 점수 계산 함수
# ============================================================


def calculate_risk_score(answers: Dict[str, int]) -> int:
    """
    기본 질문(Q1~Q5) 답변으로 risk_score를 계산한다.

    Args:
        answers: {"Q1": 3, "Q2": 2, ...} 형태의 답변

    Returns:
        0~100 사이의 risk_score
    """
    basic_questions = get_basic_questions()

    weighted_sum = 0.0
    total_weight = 0.0

    for q in basic_questions:
        q_id = q["id"]
        weight = q["weight"]

        if q_id in answers:
            answer_value = answers[q_id]
            # 1~5 점수를 가중합
            weighted_sum += answer_value * weight
            total_weight += weight

    if total_weight == 0:
        logger.warning("No valid answers for basic questions")
        return 50  # 기본값

    # 1~5 범위를 0~100으로 변환
    # (weighted_sum / total_weight)는 1~5 사이
    # (value - 1) / 4 * 100 으로 0~100 변환
    avg_score = weighted_sum / total_weight  # 1~5
    risk_score = int(((avg_score - 1) / 4) * 100)

    # 범위 제한
    risk_score = max(0, min(100, risk_score))

    logger.info(f"Calculated risk_score: {risk_score} from weighted_sum={weighted_sum:.2f}")
    return risk_score


def determine_expertise(term_answers: Dict[str, bool]) -> str:
    """
    용어 체크(T1~T5) 답변으로 expertise_level을 결정한다.

    Args:
        term_answers: {"T1": True, "T2": False, ...} 형태

    Returns:
        "beginner" | "intermediate" | "advanced"
    """
    known_count = sum(1 for knows in term_answers.values() if knows)

    if known_count <= 1:
        return "beginner"
    elif known_count <= 3:
        return "intermediate"
    else:
        return "advanced"


def should_show_advanced(term_answers: Dict[str, bool]) -> bool:
    """
    고급 질문(Q6~Q10) 표시 여부를 결정한다.

    Args:
        term_answers: {"T1": True, "T2": False, ...} 형태

    Returns:
        True if 3개 이상 "안다"
    """
    known_count = sum(1 for knows in term_answers.values() if knows)
    return known_count >= 3
