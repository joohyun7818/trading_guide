"""
AlphaFlow US v2 - 시뮬레이션 엔진
과거 시장 상황 기반 매매 판단 시뮬레이션
"""
import logging
from typing import Dict, List
import random

logger = logging.getLogger(__name__)

# ==================== 시나리오 정의 ====================

SCENARIOS = {
    "covid_crash_week2": {
        "key": "covid_crash_week2",
        "name": "코로나 폭락 2주차",
        "description": "WHO가 팬데믹을 선언하고 각국이 봉쇄를 시작한 시점",
        "ticker": "SPY",
        "decision_date": "2020-03-13",
        "chart_start": "2020-01-01",
        "chart_end": "2020-03-13",
        "context": {
            "price_1m_ago": 310.33,
            "price_1w_ago": 270.50,
            "price_now": 228.80,
            "change_1m": -26.3,
            "change_1w": -15.4
        },
        "news_negative": [
            "WHO, 코로나19 팬데믹 선언",
            "미국 유럽발 입국 30일 금지",
            "NYSE 서킷브레이커 이번 주 두 번째 발동"
        ],
        "news_positive": [
            "Fed, 1.5조 달러 유동성 공급 발표",
            "트럼프 대통령, 국가비상사태 선포 (경기 부양 기대)"
        ],
        "question": "이 상황에서 SPY(S&P500 ETF)를 매수하시겠습니까?",
        "aftermath": {
            "1w": -1.2,
            "1m": 18.7,
            "3m": 35.4,
            "6m": 46.2,
            "1y": 67.1
        },
        "action_scores": {
            "buy": 5,
            "hold": 3,
            "sell": 1
        },
        "market_type": "down"
    },
    "gfc_2008_bottom": {
        "key": "gfc_2008_bottom",
        "name": "2008 금융위기 바닥",
        "description": "서브프라임 위기로 시장이 붕괴하고 공포가 극대화된 시점",
        "ticker": "SPY",
        "decision_date": "2009-03-06",
        "chart_start": "2008-09-01",
        "chart_end": "2009-03-06",
        "context": {
            "price_1m_ago": 82.76,
            "price_1w_ago": 73.14,
            "price_now": 68.11,
            "change_1m": -17.7,
            "change_1w": -6.9
        },
        "news_negative": [
            "실업률 8.1%로 급등, 25년 만에 최고치",
            "GM, 파산 신청 임박",
            "주택 압류 건수 역대 최고"
        ],
        "news_positive": [
            "오바마, 7870억 달러 경기부양책 승인",
            "Fed, 기준금리 0~0.25%로 사실상 제로금리"
        ],
        "question": "이 상황에서 SPY(S&P500 ETF)를 매수하시겠습니까?",
        "aftermath": {
            "1w": 6.9,
            "1m": 23.9,
            "3m": 39.4,
            "6m": 54.2,
            "1y": 68.6
        },
        "action_scores": {
            "buy": 5,
            "hold": 3,
            "sell": 1
        },
        "market_type": "down"
    },
    "covid_recovery": {
        "key": "covid_recovery",
        "name": "코로나 V자 회복 초기",
        "description": "역대급 폭락 후 반등 신호가 나타나기 시작한 시점",
        "ticker": "QQQ",
        "decision_date": "2020-03-27",
        "chart_start": "2020-02-01",
        "chart_end": "2020-03-27",
        "context": {
            "price_1m_ago": 218.72,
            "price_1w_ago": 165.17,
            "price_now": 181.86,
            "change_1m": -16.9,
            "change_1w": 10.1
        },
        "news_negative": [
            "미국 코로나 확진자 세계 1위",
            "실업수당 청구 330만 건, 역대 최대"
        ],
        "news_positive": [
            "미 의회, 2조 달러 경기부양안 통과",
            "Fed, 무제한 양적완화 발표",
            "기술주 중심으로 강한 반등세"
        ],
        "question": "이 상황에서 QQQ(나스닥100 ETF)를 매수하시겠습니까?",
        "aftermath": {
            "1w": 3.2,
            "1m": 15.8,
            "3m": 31.4,
            "6m": 48.9,
            "1y": 76.2
        },
        "action_scores": {
            "buy": 5,
            "hold": 4,
            "sell": 2
        },
        "market_type": "up"
    },
    "inflation_2022": {
        "key": "inflation_2022",
        "name": "2022 인플레 긴축 시작",
        "description": "Fed가 매파적 기조로 전환하며 긴축 시작을 예고한 시점",
        "ticker": "QQQ",
        "decision_date": "2022-01-14",
        "chart_start": "2021-11-01",
        "chart_end": "2022-01-14",
        "context": {
            "price_1m_ago": 403.73,
            "price_1w_ago": 382.61,
            "price_now": 361.28,
            "change_1m": -10.5,
            "change_1w": -5.6
        },
        "news_negative": [
            "12월 CPI 7.0%, 40년 만에 최고",
            "Fed, 3월 금리인상 시사",
            "고성장 기술주 급락세"
        ],
        "news_positive": [
            "기업 실적은 여전히 양호",
            "백신 보급으로 경제 정상화 기대"
        ],
        "question": "이 상황에서 QQQ(나스닥100 ETF)를 매수하시겠습니까?",
        "aftermath": {
            "1w": -2.8,
            "1m": -8.4,
            "3m": -18.2,
            "6m": -27.3,
            "1y": -29.5
        },
        "action_scores": {
            "buy": 1,
            "hold": 3,
            "sell": 5
        },
        "market_type": "down"
    },
    "ai_rally_2023": {
        "key": "ai_rally_2023",
        "name": "2023 AI 랠리",
        "description": "ChatGPT 열풍으로 AI 관련주가 폭등하는 시점",
        "ticker": "QQQ",
        "decision_date": "2023-05-26",
        "chart_start": "2023-01-01",
        "chart_end": "2023-05-26",
        "context": {
            "price_1m_ago": 314.66,
            "price_1w_ago": 329.18,
            "price_now": 342.67,
            "change_1m": 8.9,
            "change_1w": 4.1
        },
        "news_negative": [
            "Fed, 금리동결 시사하지만 추가 인상 가능성",
            "채무한도 협상 불확실성"
        ],
        "news_positive": [
            "엔비디아 실적 서프라이즈, 주가 24% 급등",
            "AI 관련주 랠리 지속",
            "빅테크 실적 개선세"
        ],
        "question": "이 상황에서 QQQ(나스닥100 ETF)를 매수하시겠습니까?",
        "aftermath": {
            "1w": 2.1,
            "1m": 6.3,
            "3m": 12.8,
            "6m": 18.4,
            "1y": 32.7
        },
        "action_scores": {
            "buy": 4,
            "hold": 3,
            "sell": 2
        },
        "market_type": "up"
    },
    "dot_com_peak": {
        "key": "dot_com_peak",
        "name": "닷컴버블 정점",
        "description": "인터넷 기업 거품이 정점에 달하고 FOMO가 극대화된 시점",
        "ticker": "SPY",
        "decision_date": "2000-03-10",
        "chart_start": "1999-10-01",
        "chart_end": "2000-03-10",
        "context": {
            "price_1m_ago": 142.35,
            "price_1w_ago": 150.72,
            "price_now": 153.46,
            "change_1m": 7.8,
            "change_1w": 1.8
        },
        "news_negative": [
            "나스닥 P/E 비율 역대 최고치",
            "실적 없는 닷컴 기업들 고평가 우려",
            "Fed 금리인상 지속"
        ],
        "news_positive": [
            "인터넷 혁명으로 새로운 시대 개막",
            "닷컴 IPO 열풍 지속",
            "투자자 FOMO 극대화"
        ],
        "question": "이 상황에서 SPY(S&P500 ETF)를 매수하시겠습니까?",
        "aftermath": {
            "1w": -4.0,
            "1m": -8.7,
            "3m": -12.1,
            "6m": -17.8,
            "1y": -28.5
        },
        "action_scores": {
            "buy": 1,
            "hold": 2,
            "sell": 5
        },
        "market_type": "mixed"
    },
    "sideways_2015": {
        "key": "sideways_2015",
        "name": "2015 횡보장",
        "description": "중국 경제 둔화 우려로 방향성이 불투명한 시점",
        "ticker": "SPY",
        "decision_date": "2015-08-21",
        "chart_start": "2015-05-01",
        "chart_end": "2015-08-21",
        "context": {
            "price_1m_ago": 211.02,
            "price_1w_ago": 206.04,
            "price_now": 199.23,
            "change_1m": -5.6,
            "change_1w": -3.3
        },
        "news_negative": [
            "중국 증시 폭락, 상하이 지수 8.5% 급락",
            "중국 위안화 평가절하",
            "신흥국 경제 불안"
        ],
        "news_positive": [
            "미국 경제는 견조한 성장세",
            "기업 실적 양호",
            "Fed 금리인상 지연 가능성"
        ],
        "question": "이 상황에서 SPY(S&P500 ETF)를 매수하시겠습니까?",
        "aftermath": {
            "1w": -5.8,
            "1m": -3.2,
            "3m": 1.4,
            "6m": -1.8,
            "1y": -6.9
        },
        "action_scores": {
            "buy": 2,
            "hold": 4,
            "sell": 3
        },
        "market_type": "mixed"
    },
    "flash_crash_2010": {
        "key": "flash_crash_2010",
        "name": "2010 플래시 크래시",
        "description": "알고리즘 매매 폭주로 순식간에 급락 후 회복한 시점",
        "ticker": "SPY",
        "decision_date": "2010-05-07",
        "chart_start": "2010-02-01",
        "chart_end": "2010-05-07",
        "context": {
            "price_1m_ago": 118.55,
            "price_1w_ago": 118.81,
            "price_now": 110.79,
            "change_1m": -6.5,
            "change_1w": -6.7
        },
        "news_negative": [
            "전날 다우지수 장중 9% 급락 (역대급)",
            "그리스 재정위기 악화",
            "유럽 금융 불안 확산"
        ],
        "news_positive": [
            "SEC, 플래시 크래시는 일시적 현상으로 판단",
            "시장 회로 차단 장치 개선 논의",
            "미국 경제 펀더멘털은 양호"
        ],
        "question": "이 상황에서 SPY(S&P500 ETF)를 매수하시겠습니까?",
        "aftermath": {
            "1w": 4.2,
            "1m": 0.8,
            "3m": 6.7,
            "6m": 11.3,
            "1y": 18.9
        },
        "action_scores": {
            "buy": 4,
            "hold": 3,
            "sell": 2
        },
        "market_type": "mixed"
    }
}


# ==================== 함수 ====================

def get_all_scenarios() -> List[Dict]:
    """모든 시나리오 반환"""
    return list(SCENARIOS.values())


def get_random_scenarios(count: int = 5) -> List[Dict]:
    """랜덤으로 N개 시나리오 선택

    Args:
        count: 선택할 시나리오 개수

    Returns:
        List[Dict]: 선택된 시나리오 목록
    """
    all_scenarios = list(SCENARIOS.values())
    if count >= len(all_scenarios):
        return all_scenarios

    selected = random.sample(all_scenarios, count)
    logger.info(f"{count}개 시나리오 선택: {[s['key'] for s in selected]}")
    return selected


def get_scenario_by_key(key: str) -> Dict:
    """키로 시나리오 조회

    Args:
        key: 시나리오 키

    Returns:
        Dict: 시나리오 데이터
    """
    if key in SCENARIOS:
        return SCENARIOS[key]

    logger.warning(f"시나리오를 찾을 수 없음: {key}")
    return {}


def calculate_action_score(scenario_key: str, action: str) -> int:
    """행동 점수 계산

    Args:
        scenario_key: 시나리오 키
        action: 'buy', 'hold', 'sell'

    Returns:
        int: 행동 점수 (1~5)
    """
    scenario = get_scenario_by_key(scenario_key)
    if not scenario or "action_scores" not in scenario:
        return 3  # 기본값

    return scenario["action_scores"].get(action, 3)
