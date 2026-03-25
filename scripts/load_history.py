#!/usr/bin/env python3
"""AlphaFlow US v2 - 과거 가격 데이터 로딩"""
import asyncio
import logging
from datetime import datetime, timedelta

import asyncpg
import pandas as pd
import yfinance as yf

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

DB_URL = "postgresql://alphaflow:alphaflow123@localhost:5432/alphaflow_us"

TICKERS = [
    "SPY", "QQQ", "AGG", "IWM",
    "XLK", "XLF", "XLV", "XLE", "XLY", "XLI", "XLP", "XLU", "XLRE", "XLC", "XLB",
]


async def main():
    pool = await asyncpg.create_pool(DB_URL, min_size=1, max_size=3)
    total = 0

    end_date = datetime.now()
    start_date = end_date - timedelta(days=365 * 10)
    start_str = start_date.strftime("%Y-%m-%d")
    end_str = end_date.strftime("%Y-%m-%d")

    logger.info(f"기간: {start_str} ~ {end_str}")

    for ticker in TICKERS:
        logger.info(f"{ticker} 다운로드 중...")

        try:
            data = yf.download(ticker, start=start_str, end=end_str, progress=False, auto_adjust=False)
        except Exception as e:
            logger.error(f"{ticker} 다운로드 실패: {e}")
            continue

        if data.empty:
            logger.warning(f"{ticker} 데이터 없음")
            continue

        # MultiIndex 컬럼 처리
        if isinstance(data.columns, pd.MultiIndex):
            data.columns = [col[0] for col in data.columns]

        # reset_index를 먼저 해서 Date를 컬럼으로 꺼냄
        data = data.reset_index()

        # 그 다음 전체 컬럼명 소문자 변환
        data.columns = [c.lower().replace(" ", "_") for c in data.columns]

        if "adj_close" not in data.columns:
            data["adj_close"] = data["close"]

        logger.info(f"{ticker} 컬럼: {list(data.columns)}, {len(data)}행")

        saved = 0
        async with pool.acquire() as conn:
            for _, row in data.iterrows():
                try:
                    dt = row["date"]
                    if hasattr(dt, "date"):
                        dt = dt.date()

                    await conn.execute(
                        """
                        INSERT INTO price_history (ticker, date, open, high, low, close, volume, adj_close)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                        ON CONFLICT (ticker, date) DO NOTHING
                        """,
                        ticker,
                        dt,
                        float(row["open"]),
                        float(row["high"]),
                        float(row["low"]),
                        float(row["close"]),
                        int(row["volume"]) if not pd.isna(row["volume"]) else 0,
                        float(row["adj_close"]),
                    )
                    saved += 1
                except Exception as e:
                    logger.error(f"저장 실패 {ticker} {row.get('date')}: {e}")

        total += saved
        logger.info(f"{ticker}: {saved}행 저장")
        await asyncio.sleep(0.5)

    await pool.close()
    logger.info(f"완료! 총 {total}행 저장")


if __name__ == "__main__":
    asyncio.run(main())
