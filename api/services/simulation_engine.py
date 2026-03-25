"""
AlphaFlow US v2 - 시뮬레이션 엔진
과거 시장 상황 기반 매매 판단 시뮬레이션
"""
import logging
import random
from datetime import datetime, timedelta
from typing import Dict, List, Optional

import yfinance as yf

logger = logging.getLogger(__name__)

# ==================== 시나리오 정의 ====================

SCENARIOS: Dict[str, Dict] = {
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
            "2020-03-11: WHO, 코로나19 팬데믹 선언",
            "2020-03-12: 미국, 유럽발 입국 30일 금지",
            "2020-03-09: NYSE 서킷브레이커 이번 주 두 번째 발동"
        ],
        "news_positive": [
            "2020-03-12: Fed, 1.5조 달러 유동성 공급 발표",
            "2020-03-13: 트럼프, 국가비상사태 선포 (경기 부양 기대)"
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
            "2009-03-06: 실업률 8.1%로 급등, 25년 만에 최고치",
            "2009-02-17: GM, 파산 신청 임박 뉴스 확산",
            "2009-02-10: 주택 압류 건수 역대 최고"
        ],
        "news_positive": [
            "2009-02-17: 오바마, 7870억 달러 경기부양책 승인",
            "2008-12-16: Fed, 기준금리 0~0.25%로 사실상 제로금리"
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
            "2020-03-26: 미국 코로나 확진자 세계 1위",
            "2020-03-26: 실업수당 청구 330만 건, 역대 최대"
        ],
        "news_positive": [
            "2020-03-25: 미 의회, 2조 달러 경기부양안 합의",
            "2020-03-23: Fed, 무제한 양적완화 발표",
            "2020-03-24: 기술주 중심 반등세 시작"
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
            "2022-01-12: 12월 CPI 7.0%, 40년 만에 최고",
            "2022-01-05: Fed, 3월 금리인상 시사 (의사록)",
            "2022-01-10: 고성장 기술주 급락세"
        ],
        "news_positive": [
            "2022-01-13: 일부 기업 실적 양호",
            "2022-01-10: 백신 보급으로 경제 정상화 기대"
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
            "2023-05-24: Fed, 금리동결 시사하지만 추가 인상 가능성 언급",
            "2023-05-23: 채무한도 협상 불확실성"
        ],
        "news_positive": [
            "2023-05-25: 엔비디아 실적 서프라이즈, 주가 24% 급등",
            "2023-05-26: AI 관련주 랠리 지속",
            "2023-05-10: 빅테크 실적 개선세"
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
            "2000-03-07: 나스닥 P/E 비율 역대 최고치",
            "2000-03-08: 실적 없는 닷컴 기업 고평가 우려",
            "2000-02-02: Fed 금리인상 지속"
        ],
        "news_positive": [
            "2000-03-09: 인터넷 혁명으로 새로운 시대 기대",
            "2000-03-07: 닷컴 IPO 열풍 지속",
            "2000-03-06: 투자자 FOMO 극대화"
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
            "2015-08-24: 중국 증시 폭락, 상하이 지수 8.5% 급락",
            "2015-08-11: 중국 위안화 전격 평가절하",
            "2015-08-17: 신흥국 경제 불안 확대"
        ],
        "news_positive": [
            "2015-08-15: 미국 경제는 견조한 성장세 유지",
            "2015-08-10: 기업 실적 양호",
            "2015-08-19: Fed 금리인상 지연 가능성 대두"
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
            "2010-05-06: 다우지수 장중 9% 급락 (플래시 크래시)",
            "2010-05-05: 그리스 재정위기 악화",
            "2010-05-04: 유럽 금융 불안 확산"
        ],
        "news_positive": [
            "2010-05-07: SEC, 플래시 크래시는 일시적 현상으로 판단",
            "2010-05-07: 시장 회로 차단 장치 개선 논의",
            "2010-05-06: 미국 경제 펀더멘털은 양호"
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
    """랜덤으로 N개 시나리오 선택"""
    all_scenarios = list(SCENARIOS.values())
    if count >= len(all_scenarios):
        return all_scenarios
    selected = random.sample(all_scenarios, count)
    logger.info(f"{count}개 시나리오 선택: {[s['key'] for s in selected]}")
    return selected


def get_scenario_by_key(key: str) -> Dict:
    """키로 시나리오 조회"""
    if key in SCENARIOS:
        return SCENARIOS[key]
    logger.warning(f"시나리오를 찾을 수 없음: {key}")
    return {}


def select_scenarios(risk_score: int, expertise_level: str) -> List[Dict]:
    """사용자의 위험 점수와 전문성 수준에 따라 시나리오 선택"""
    if expertise_level == "beginner":
        selected = [
            SCENARIOS["covid_crash_week2"],
            SCENARIOS["ai_rally_2023"]
        ]
    elif expertise_level == "intermediate":
        selected = [
            SCENARIOS["covid_crash_week2"],
            SCENARIOS["ai_rally_2023"],
            SCENARIOS["gfc_2008_bottom"]
        ]
    else:
        selected = [
            SCENARIOS["covid_crash_week2"],
            SCENARIOS["ai_rally_2023"],
            SCENARIOS["gfc_2008_bottom"],
            SCENARIOS["sideways_2015"],
            SCENARIOS["dot_com_peak"]
        ]

    logger.info(
        f"시나리오 선택: risk_score={risk_score}, expertise={expertise_level}, "
        f"count={len(selected)}, scenarios={[s['key'] for s in selected]}"
    )

    market_types = [s.get("market_type") for s in selected]
    has_down = any(mt == "down" for mt in market_types)
    has_up = any(mt == "up" for mt in market_types)

    if not has_down or not has_up:
        logger.warning(
            f"시나리오 선택 검증 실패: has_down={has_down}, has_up={has_up}"
        )

    return selected


def _build_context_chart(context: Dict, chart_end: str) -> List[Dict]:
    """컨텍스트 데이터를 이용해 간이 차트 생성"""
    try:
        end_date = datetime.strptime(chart_end, "%Y-%m-%d").date()
    except ValueError:
        return []

    points = []
    context_points = [
        ("-1m", context.get("price_1m_ago")),
        ("-1w", context.get("price_1w_ago")),
        ("now", context.get("price_now"))
    ]

    for label, price in context_points:
        if price is None:
            continue
        if label == "-1m":
            date = end_date - timedelta(days=30)
        elif label == "-1w":
            date = end_date - timedelta(days=7)
        else:
            date = end_date

        points.append({
            "date": date.isoformat(),
            "open": float(price),
            "high": float(price),
            "low": float(price),
            "close": float(price),
            "volume": 0,
            "adj_close": float(price)
        })

    return sorted(points, key=lambda x: x["date"])


def _run_async(coro):
    """비동기 함수를 동기적으로 안전하게 실행"""
    import asyncio

    try:
        return asyncio.run(coro)
    except RuntimeError:
        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(coro)
        finally:
            loop.close()


def get_scenario_chart_data(
    ticker: str,
    chart_start: str,
    chart_end: str,
    context: Optional[Dict] = None
) -> List[Dict]:
    """시나리오 차트용 가격 데이터 조회 (DB 우선, 실패 시 yfinance, 마지막으로 컨텍스트)"""
    try:
        from api.core.database import get_pool
        import asyncio

        async def get_from_db():
            pool = get_pool()
            async with pool.acquire() as conn:
                return await conn.fetch(
                    """
                    SELECT date, open, high, low, close, volume, adj_close
                    FROM price_history
                    WHERE symbol = $1 AND date >= $2 AND date <= $3
                    ORDER BY date ASC
                    """,
                    ticker,
                    datetime.strptime(chart_start, "%Y-%m-%d").date(),
                    datetime.strptime(chart_end, "%Y-%m-%d").date()
                )

        db_rows = _run_async(get_from_db())

        if db_rows:
            logger.info(f"DB에서 차트 데이터 조회 성공: {ticker}, {len(db_rows)}개")
            return [
                {
                    "date": row["date"].isoformat(),
                    "open": float(row["open"]),
                    "high": float(row["high"]),
                    "low": float(row["low"]),
                    "close": float(row["close"]),
                    "volume": int(row["volume"]) if row["volume"] else 0,
                    "adj_close": float(row["adj_close"])
                }
                for row in db_rows
            ]

    except Exception as e:
        logger.warning(f"DB 조회 실패, yfinance로 전환: {e}")

    try:
        logger.info(f"yfinance에서 데이터 조회: {ticker}, {chart_start}~{chart_end}")
        df = yf.download(ticker, start=chart_start, end=chart_end, progress=False)

        if df.empty:
            logger.warning(f"yfinance 데이터 없음: {ticker}")
            return _build_context_chart(context or {}, chart_end)

        chart_data = []
        for date, row in df.iterrows():
            chart_data.append({
                "date": date.strftime("%Y-%m-%d"),
                "open": float(row["Open"]),
                "high": float(row["High"]),
                "low": float(row["Low"]),
                "close": float(row["Close"]),
                "volume": int(row["Volume"]),
                "adj_close": float(row["Adj Close"])
            })

        logger.info(f"yfinance 조회 성공: {ticker}, {len(chart_data)}개")

        try:
            import asyncio

            async def save_to_db():
                pool = get_pool()
                async with pool.acquire() as conn:
                    for data in chart_data:
                        await conn.execute(
                            """
                            INSERT INTO price_history
                            (symbol, date, open, high, low, close, volume, adj_close)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                            ON CONFLICT (symbol, date) DO NOTHING
                            """,
                            ticker,
                            datetime.strptime(data["date"], "%Y-%m-%d").date(),
                            data["open"],
                            data["high"],
                            data["low"],
                            data["close"],
                            data["volume"],
                            data["adj_close"]
                        )

            _run_async(save_to_db())
            logger.info(f"DB 저장 완료: {ticker}, {len(chart_data)}개")

        except Exception as e:
            logger.warning(f"DB 저장 실패: {e}")

        return chart_data

    except Exception as e:
        logger.error(f"yfinance 조회 실패: {e}")
        return _build_context_chart(context or {}, chart_end)


def calculate_action_score(scenario_key: str, action: str) -> int:
    """행동 점수 계산 (매수=5, 홀드=3, 매도=1 등 시나리오별 정의 활용)"""
    scenario = get_scenario_by_key(scenario_key)
    if not scenario or "action_scores" not in scenario:
        return 3
    return scenario["action_scores"].get(action, 3)
