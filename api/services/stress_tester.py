"""
AlphaFlow US v2 - 스트레스 테스트
주요 위기/랠리 구간에서 전략 성과 측정
"""
import logging
import math
from typing import Dict, List

import pandas as pd

from api.services import backtester

logger = logging.getLogger(__name__)

STRESS_PERIODS: Dict[str, Dict[str, str | float]] = {
    # 하락장
    "dotcom_crash": {"key": "dotcom_crash", "name": "닷컴 버블 붕괴", "start": "2000-03-24", "end": "2002-10-09", "sp500": -49.1},
    "gfc_2008": {"key": "gfc_2008", "name": "2008 금융위기", "start": "2007-10-09", "end": "2009-03-09", "sp500": -56.8},
    "covid_crash": {"key": "covid_crash", "name": "코로나 폭락", "start": "2020-02-19", "end": "2020-03-23", "sp500": -33.9},
    "inflation_2022": {"key": "inflation_2022", "name": "2022 인플레 베어마켓", "start": "2022-01-03", "end": "2022-10-12", "sp500": -25.4},
    # 상승장
    "post_gfc_bull": {"key": "post_gfc_bull", "name": "금융위기 후 상승", "start": "2009-03-09", "end": "2010-03-09", "sp500": 68.6},
    "covid_recovery": {"key": "covid_recovery", "name": "코로나 V자 회복", "start": "2020-03-23", "end": "2021-03-23", "sp500": 74.8},
    "ai_rally_2023": {"key": "ai_rally_2023", "name": "2023 AI 랠리", "start": "2023-01-01", "end": "2023-12-31", "sp500": 24.2},
    # 혼합
    "sideways_2015": {"key": "sideways_2015", "name": "2015 횡보장", "start": "2015-01-01", "end": "2015-12-31", "sp500": -0.7},
}

DETAIL_LEVELS = {
    "beginner": ["covid_crash", "gfc_2008", "covid_recovery"],
    "intermediate": ["covid_crash", "gfc_2008", "covid_recovery", "dotcom_crash", "ai_rally_2023", "inflation_2022"],
    "advanced": list(STRESS_PERIODS.keys()),
}


def get_stress_periods(detail_level: str) -> List[Dict]:
    """detail_level에 따른 스트레스 구간 목록 반환"""
    level = (detail_level or "beginner").lower()
    keys = DETAIL_LEVELS.get(level, DETAIL_LEVELS["beginner"])
    return [STRESS_PERIODS[k] for k in keys if k in STRESS_PERIODS]


def _calc_recovery_months(daily_equity: List[Dict]) -> int:
    """MDD 이후 원금 회복까지 걸린 개월 수 계산"""
    if not daily_equity:
        return -1

    series = pd.Series(
        [item["value"] for item in daily_equity],
        index=pd.to_datetime([item["date"] for item in daily_equity]),
    )

    if series.empty or series.iloc[0] <= 0:
        return -1

    initial = series.iloc[0]
    trough_date = series.idxmin()
    post_trough = series[series.index >= trough_date]
    recovered = post_trough[post_trough >= initial]

    if recovered.empty:
        return -1

    delta_days = (recovered.index[0] - trough_date).days
    return int(math.ceil(delta_days / 30)) if delta_days > 0 else 0


async def run_stress_test(strategy: Dict, detail_level: str) -> List[Dict]:
    """각 스트레스 구간에 대해 백테스트 실행"""
    periods = get_stress_periods(detail_level)
    results: List[Dict] = []

    for period in periods:
        key = period["key"]
        name = period["name"]
        start = period["start"]
        end = period["end"]

        try:
            result = await backtester.run_backtest_for_range(strategy, start, end, label=key)
            metrics = result.get("metrics", {})
            my_return = metrics.get("total_return", 0.0)

            benchmark_curve = result.get("benchmark_equity") or []
            sp500_return = float(period.get("sp500", 0.0))
            if benchmark_curve:
                start_val = benchmark_curve[0]["value"]
                end_val = benchmark_curve[-1]["value"]
                if start_val:
                    sp500_return = (end_val / start_val - 1) * 100

            excess_return = my_return - sp500_return
            recovery_months = _calc_recovery_months(result.get("daily_equity") or [])

            results.append(
                {
                    "period_key": key,
                    "period_name": name,
                    "start": start,
                    "end": end,
                    "my_return": round(my_return, 4),
                    "sp500_return": round(sp500_return, 4),
                    "excess_return": round(excess_return, 4),
                    "recovery_months": recovery_months,
                    "metrics": metrics,
                    "daily_equity": result.get("daily_equity", []),
                    "benchmark_equity": result.get("benchmark_equity", []),
                }
            )
        except Exception as exc:  # pragma: no cover - 데이터 부족 등
            logger.error(f"스트레스 테스트 실패: {key}, 오류: {exc}")

    return results
