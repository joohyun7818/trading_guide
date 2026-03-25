"""
AlphaFlow US v2 - 백테스트 엔진
자산 배분, 리밸런싱, 손절 및 주요 지표 계산
"""
import asyncio
import logging
from datetime import datetime
from typing import Dict, Iterable, List, Optional, Tuple

import pandas as pd

from api.services import data_loader

logger = logging.getLogger(__name__)

# 기간 매핑
PERIOD_YEAR_MAP = {"1y": 1, "2y": 2, "3y": 3, "5y": 5, "10y": 10}


def _get_allocation(strategy: Dict) -> Tuple[float, float, float]:
    """전략에서 주식/채권/현금 비중 추출"""
    allocation = strategy.get("asset_allocation", {}) or {}
    equity = (
        allocation.get("us_equity")
        or allocation.get("equity")
        or allocation.get("stocks")
        or allocation.get("stock")
        or 0.0
    )
    bonds = allocation.get("bond") or allocation.get("bonds") or allocation.get("fixed_income") or 0.0
    cash = allocation.get("cash", max(0.0, 1.0 - equity - bonds))
    return float(equity), float(bonds), float(cash)


def _build_target_weights(strategy: Dict, available: Iterable[str]) -> Dict[str, float]:
    """사용 가능한 심볼에 맞춰 목표 비중 생성"""
    equity_weight, bond_weight, cash_weight = _get_allocation(strategy)
    equity_detail = strategy.get("equity_detail", {}) or {}
    sector_weights = equity_detail.get("sector_weights") or {"SPY": 1.0}

    sector_total = sum(sector_weights.values())
    if sector_total <= 0:
        sector_weights = {"SPY": 1.0}
        sector_total = 1.0

    target: Dict[str, float] = {}
    for symbol, weight in sector_weights.items():
        if symbol in available:
            target[symbol] = equity_weight * (weight / sector_total)

    # 채권
    if bond_weight > 0 and "AGG" in available:
        target["AGG"] = bond_weight

    # 비중 누락 시 남는 비중은 현금으로 보유
    allocated = sum(target.values())
    cash_portion = max(cash_weight, 1.0 - allocated)
    target["cash"] = max(0.0, cash_portion)

    # 총합이 1을 넘을 경우 정규화
    total = sum(target.values())
    if total > 1.0:
        target = {k: v / total for k, v in target.items()}

    return target


def _prepare_returns(price_map: Dict[str, pd.DataFrame], start: datetime, end: datetime) -> pd.DataFrame:
    """가격 데이터에서 일별 수익률 DataFrame 생성"""
    series_list = []
    for symbol, df in price_map.items():
        if df.empty:
            continue

        tmp = df.copy()
        tmp["date"] = pd.to_datetime(tmp["date"])
        tmp = tmp[(tmp["date"] >= start) & (tmp["date"] <= end)]
        if tmp.empty:
            continue

        price_col = "adj_close" if "adj_close" in tmp.columns else "close"
        s = tmp.set_index("date")[price_col].astype(float)
        s.name = symbol
        series_list.append(s)

    if not series_list:
        return pd.DataFrame()

    prices = pd.concat(series_list, axis=1, join="inner").sort_index()
    if prices.empty:
        return pd.DataFrame()

    returns = prices.pct_change().fillna(0.0)
    return returns


def _should_rebalance(current_date: pd.Timestamp, last_rebalance: Optional[pd.Timestamp], frequency: str) -> bool:
    """리밸런싱 여부 판단"""
    if last_rebalance is None:
        return True

    freq = (frequency or "quarterly").lower()
    delta_days = (current_date - last_rebalance).days

    if freq == "weekly":
        return delta_days >= 7
    if freq == "monthly":
        return current_date.month != last_rebalance.month or current_date.year != last_rebalance.year
    if freq == "quarterly":
        month_gap = (current_date.year - last_rebalance.year) * 12 + (current_date.month - last_rebalance.month)
        return month_gap >= 3
    if freq == "semi_annually":
        month_gap = (current_date.year - last_rebalance.year) * 12 + (current_date.month - last_rebalance.month)
        return month_gap >= 6
    if freq == "yearly":
        return current_date.year != last_rebalance.year

    return False


def _apply_slippage_cost(
    portfolio_value: float, current_weights: Dict[str, float], target_weights: Dict[str, float], slippage_rate: float
) -> float:
    """목표 비중 변경 시 슬리피지 비용 계산"""
    symbols = set(current_weights.keys()) | set(target_weights.keys())
    turnover = sum(abs(target_weights.get(sym, 0.0) - current_weights.get(sym, 0.0)) for sym in symbols) / 2
    traded_value = portfolio_value * turnover
    return traded_value * slippage_rate


def _calculate_metrics(
    equity_series: pd.Series, benchmark_series: pd.Series, daily_returns: pd.Series, years: float
) -> Dict[str, float]:
    """지표 계산"""
    total_return = (equity_series.iloc[-1] / equity_series.iloc[0] - 1) * 100 if len(equity_series) > 1 else 0.0
    cagr = 0.0
    if years > 0 and equity_series.iloc[0] > 0:
        cagr = (equity_series.iloc[-1] / equity_series.iloc[0]) ** (1 / years) - 1

    rolling_max = equity_series.cummax()
    drawdowns = equity_series / rolling_max - 1
    mdd = float(drawdowns.min()) if not drawdowns.empty else 0.0

    rf_daily = 0.04 / 252
    avg = daily_returns.mean()
    std = daily_returns.std(ddof=0)
    sharpe = ((avg - rf_daily) / std) * (252 ** 0.5) if std > 0 else 0.0

    downside = daily_returns[daily_returns < 0]
    downside_std = downside.std(ddof=0)
    sortino = ((avg - rf_daily) / downside_std) * (252 ** 0.5) if downside_std > 0 else 0.0

    calmar = (cagr / abs(mdd)) if mdd < 0 else 0.0

    monthly = equity_series.resample("M").last().pct_change().dropna()
    win_rate = float((monthly > 0).mean() * 100) if not monthly.empty else 0.0
    best_month = float(monthly.max() * 100) if not monthly.empty else 0.0
    worst_month = float(monthly.min() * 100) if not monthly.empty else 0.0

    benchmark_return = (
        (benchmark_series.iloc[-1] / benchmark_series.iloc[0] - 1) * 100 if len(benchmark_series) > 1 else 0.0
    )

    return {
        "total_return": round(total_return, 4),
        "cagr": round(cagr * 100, 4),
        "mdd": round(mdd * 100, 4),
        "sharpe_ratio": round(sharpe, 4),
        "sortino_ratio": round(sortino, 4),
        "calmar_ratio": round(calmar, 4),
        "win_rate": round(win_rate, 2),
        "best_month": round(best_month, 4),
        "worst_month": round(worst_month, 4),
        "benchmark_return": round(benchmark_return, 4),
    }


def _simulate(
    strategy: Dict,
    returns_df: pd.DataFrame,
    period_label: str,
    initial_capital: float,
    start_date: datetime,
    end_date: datetime,
) -> Dict:
    """포트폴리오 시뮬레이션"""
    if returns_df.empty or "SPY" not in returns_df.columns:
        logger.warning(f"시뮬레이션 불가 - 데이터 부족 (period={period_label})")
        return {
            "period": period_label,
            "metrics": {},
            "daily_equity": [],
            "benchmark_equity": [],
        }

    target_weights = _build_target_weights(strategy, returns_df.columns)
    rebalance_freq = strategy.get("rebalance_frequency", "quarterly")
    max_dd_tol = float(strategy.get("max_drawdown_tolerance", 0.0) or 0.0)
    slippage_rate = 0.001

    equity_value = initial_capital
    benchmark_value = initial_capital
    current_weights: Dict[str, float] = {"cash": 1.0}
    last_rebalance: Optional[pd.Timestamp] = None
    in_stop = False
    reentry_date: Optional[pd.Timestamp] = None
    peak_value = equity_value

    dates: List[pd.Timestamp] = []
    equity_path: List[float] = []
    benchmark_path: List[float] = []
    daily_returns: List[float] = []

    spy_returns = returns_df["SPY"]

    for current_date, row in returns_df.iterrows():
        dates.append(current_date)

        # 현금 보유 중이면 수익률 0
        if in_stop:
            daily_ret = 0.0
        else:
            # pandas Series에서 .get() 대신 직접 인덱싱 + 예외 처리
            daily_ret = sum(
                current_weights.get(sym, 0.0) * (float(row[sym]) if sym in row.index else 0.0)
                for sym in returns_df.columns
            )

        equity_value *= 1 + daily_ret
        daily_returns.append(daily_ret)

        # 최대 낙폭 감시
        peak_value = max(peak_value, equity_value)
        drawdown = (equity_value - peak_value) / peak_value if peak_value else 0.0

        if (not in_stop) and max_dd_tol > 0 and drawdown <= -max_dd_tol:
            cost = _apply_slippage_cost(equity_value, current_weights, {"cash": 1.0}, slippage_rate)
            equity_value -= cost
            current_weights = {"cash": 1.0}
            in_stop = True
            reentry_date = current_date + pd.DateOffset(months=1)
            peak_value = equity_value

        # 재진입
        if in_stop and reentry_date and current_date >= reentry_date:
            in_stop = False
            last_rebalance = None  # 즉시 리밸런싱 트리거

        # 리밸런싱
        if not in_stop and _should_rebalance(current_date, last_rebalance, rebalance_freq):
            cost = _apply_slippage_cost(equity_value, current_weights, target_weights, slippage_rate)
            equity_value -= cost
            current_weights = target_weights.copy()
            last_rebalance = current_date
            peak_value = max(peak_value, equity_value)

        # 벤치마크 (KeyError 방지)
        spy_ret = float(spy_returns.get(current_date, 0.0))
        benchmark_value *= 1 + spy_ret

        equity_path.append(equity_value)
        benchmark_path.append(benchmark_value)

    equity_series = pd.Series(equity_path, index=pd.to_datetime(dates))
    benchmark_series = pd.Series(benchmark_path, index=pd.to_datetime(dates))
    daily_return_series = pd.Series(daily_returns, index=pd.to_datetime(dates))

    years = max((end_date - start_date).days / 365.25, 0.0)
    metrics = _calculate_metrics(equity_series, benchmark_series, daily_return_series, years)

    daily_equity = [{"date": dt.strftime("%Y-%m-%d"), "value": round(val, 4)} for dt, val in equity_series.items()]
    benchmark_equity = [
        {"date": dt.strftime("%Y-%m-%d"), "value": round(val, 4)} for dt, val in benchmark_series.items()
    ]

    return {
        "period": period_label,
        "metrics": metrics,
        "daily_equity": daily_equity,
        "benchmark_equity": benchmark_equity,
    }


async def _run_with_range(
    strategy: Dict, start_date: datetime, end_date: datetime, label: str, initial_capital: float
) -> Dict:
    """공통 로직 - 주어진 날짜 범위로 백테스트 실행"""
    symbols = set(strategy.get("equity_detail", {}).get("sector_weights", {"SPY": 1.0}).keys())
    equity_weight, bond_weight, _ = _get_allocation(strategy)
    if equity_weight > 0:
        symbols.update(["SPY", "QQQ", "IWM"])
    if bond_weight > 0:
        symbols.add("AGG")
    symbols.add("SPY")  # 벤치마크

    start_str = start_date.date().isoformat()
    end_str = end_date.date().isoformat()

    price_map = await data_loader.get_etf_data(sorted(symbols), start_str, end_str)
    returns_df = _prepare_returns(price_map, start_date, end_date)

    return await asyncio.to_thread(_simulate, strategy, returns_df, label, initial_capital, start_date, end_date)


async def run_backtest(strategy: Dict, period: str, initial_capital: float = 10000.0) -> Dict:
    """전략을 지정 기간(1y/2y/3y/5y/10y)으로 백테스트"""
    if period not in PERIOD_YEAR_MAP:
        raise ValueError(f"지원하지 않는 기간입니다: {period}")

    years = PERIOD_YEAR_MAP[period]
    end_date = datetime.utcnow()
    # pd.DateOffset은 datetime이 아닌 Timestamp를 반환할 수 있으므로 명시적 변환
    start_date = datetime(end_date.year - years, end_date.month, end_date.day)

    return await _run_with_range(strategy, start_date, end_date, period, initial_capital)


async def run_backtest_for_range(
    strategy: Dict, start: str, end: str, initial_capital: float = 10000.0, label: str | None = None
) -> Dict:
    """임의 날짜 범위 백테스트 (스트레스 테스트용)"""
    start_date = pd.to_datetime(start)
    end_date = pd.to_datetime(end)
    period_label = label or f"{start_date.date()}_{end_date.date()}"
    return await _run_with_range(strategy, start_date, end_date, period_label, initial_capital)


async def run_all_periods(strategy: Dict, initial_capital: float = 10000.0) -> List[Dict]:
    """1y,2y,3y,5y,10y 전체 실행"""
    results: List[Dict] = []
    for period in ["1y", "2y", "3y", "5y", "10y"]:
        try:
            result = await run_backtest(strategy, period, initial_capital)
            results.append(result)
        except Exception as exc:  # pragma: no cover - 데이터 부족 등
            logger.error(f"{period} 백테스트 실패: {exc}")
    return results
