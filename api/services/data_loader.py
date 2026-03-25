"""
AlphaFlow US v2 - 가격 데이터 로더
가격 데이터 조회, yfinance 다운로드 및 캐싱
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List

import pandas as pd
import yfinance as yf

from api.core.database import get_pool

logger = logging.getLogger(__name__)


async def _download_price_history(symbol: str, start: str, end: str) -> pd.DataFrame:
    """yfinance에서 가격 데이터를 다운로드하여 DataFrame으로 반환"""

    def _fetch() -> pd.DataFrame:
        data = yf.download(symbol, start=start, end=end, progress=False, auto_adjust=False)

        if data.empty:
            return pd.DataFrame()

        # MultiIndex 컬럼(normalize)
        if isinstance(data.columns, pd.MultiIndex):
            data.columns = [col[0] for col in data.columns]

        data.columns = [col.lower().replace(" ", "_") for col in data.columns]
        data = data.reset_index()

        if "date" not in data.columns and "datetime" in data.columns:
            data = data.rename(columns={"datetime": "date"})

        if "adj_close" not in data.columns and "close" in data.columns:
            data["adj_close"] = data["close"]

        data["symbol"] = symbol
        return data

    try:
        return await asyncio.to_thread(_fetch)
    except Exception as exc:  # pragma: no cover - 네트워크 오류
        logger.error(f"{symbol} 데이터 다운로드 실패: {exc}")
        return pd.DataFrame()


async def _save_price_history(df: pd.DataFrame) -> int:
    """가격 데이터를 price_history 테이블에 upsert"""
    if df.empty:
        return 0

    pool = get_pool()
    saved = 0

    async with pool.acquire() as conn:
        async with conn.transaction():
            for _, row in df.iterrows():
                try:
                    await conn.execute(
                        """
                        INSERT INTO price_history
                        (symbol, date, open, high, low, close, volume, adj_close)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                        ON CONFLICT (symbol, date) DO UPDATE SET
                            open = EXCLUDED.open,
                            high = EXCLUDED.high,
                            low = EXCLUDED.low,
                            close = EXCLUDED.close,
                            volume = EXCLUDED.volume,
                            adj_close = EXCLUDED.adj_close
                        """,
                        row["symbol"],
                        row["date"],
                        float(row["open"]),
                        float(row["high"]),
                        float(row["low"]),
                        float(row["close"]),
                        int(row["volume"]) if not pd.isna(row["volume"]) else 0,
                        float(row["adj_close"])
                    )
                    saved += 1
                except Exception as exc:  # pragma: no cover - DB 오류
                    logger.error(f"price_history 저장 실패: {exc} (symbol={row['symbol']}, date={row['date']})")

    return saved


async def load_price_data(symbol: str, start: str, end: str) -> pd.DataFrame:
    """DB 조회 후 없으면 yfinance 다운로드"""
    try:
        start_date = pd.to_datetime(start).date()
        end_date = pd.to_datetime(end).date()
    except Exception:
        logger.error(f"날짜 파싱 실패: start={start}, end={end}")
        return pd.DataFrame()

    pool = get_pool()

    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT date, open, high, low, close, volume, adj_close
                FROM price_history
                WHERE symbol = $1 AND date BETWEEN $2 AND $3
                ORDER BY date
                """,
                symbol,
                start_date,
                end_date
            )

        if rows:
            df = pd.DataFrame(rows, columns=["date", "open", "high", "low", "close", "volume", "adj_close"])
            df["symbol"] = symbol
            return df

        # 캐시 미스 -> yfinance 다운로드 후 저장
        logger.info(f"{symbol} 캐시 미스, yfinance 다운로드 시도 ({start} ~ {end})")
        df = await _download_price_history(symbol, start, end)

        if df.empty:
            logger.warning(f"{symbol} 데이터 없음 (yfinance)")
            return pd.DataFrame()

        await _save_price_history(df)
        return df

    except Exception as exc:
        logger.error(f"{symbol} 가격 데이터 로딩 실패: {exc}")
        return pd.DataFrame()


async def get_spy_data(years: int) -> pd.DataFrame:
    """SPY 최근 N년 데이터 조회"""
    end_date = datetime.utcnow().date()
    start_date = end_date - timedelta(days=365 * years)
    return await load_price_data("SPY", start_date.isoformat(), end_date.isoformat())


async def get_etf_data(symbols: List[str], start: str, end: str) -> Dict[str, pd.DataFrame]:
    """여러 ETF 데이터를 병렬 조회"""
    tasks = [load_price_data(symbol, start, end) for symbol in symbols]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    data: Dict[str, pd.DataFrame] = {}
    for symbol, result in zip(symbols, results):
        if isinstance(result, Exception):  # pragma: no cover - asyncio 예외
            logger.error(f"{symbol} 데이터 조회 실패: {result}")
            continue
        if not result.empty:
            data[symbol] = result
        else:
            logger.warning(f"{symbol} 데이터가 비어있습니다.")

    return data
