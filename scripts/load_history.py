#!/usr/bin/env python3
"""
AlphaFlow US v2 - 과거 가격 데이터 로딩
yfinance를 사용하여 S&P 500 ETF 및 주요 섹터 ETF의 10년 데이터를 DB에 저장
"""
import asyncio
import logging
from datetime import datetime, timedelta

import asyncpg
import pandas as pd
import yfinance as yf

# 환경 설정 로드
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.core.config import settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# 로딩할 ETF 목록
TICKERS = [
    "SPY",    # S&P 500
    "QQQ",    # Nasdaq 100
    "XLF",    # Financial
    "XLE",    # Energy
    "XLV",    # Healthcare
    "XLK",    # Technology
    "XLI",    # Industrial
    "XLP",    # Consumer Staples
    "XLU",    # Utilities
    "XLRE",   # Real Estate
    "XLC",    # Communication Services
    "XLB",    # Materials
    "XLY"    # Consumer Discretionary
]


async def fetch_price_data(ticker: str, start_date: str, end_date: str) -> pd.DataFrame:
    """yfinance를 사용하여 가격 데이터 다운로드

    Args:
        ticker: 티커 심볼
        start_date: 시작일 (YYYY-MM-DD)
        end_date: 종료일 (YYYY-MM-DD)

    Returns:
        DataFrame: OHLCV 데이터
    """
    logger.info(f"{ticker} 데이터 다운로드 중... ({start_date} ~ {end_date})")

    try:
        loop = asyncio.get_event_loop()
        data = await loop.run_in_executor(
            None,
            lambda: yf.download(
                ticker,
                start=start_date,
                end=end_date,
                progress=False,
                auto_adjust=False
            )
        )

        if data.empty:
            logger.warning(f"{ticker} 데이터가 비어있습니다.")
            return pd.DataFrame()

        # MultiIndex 컬럼 처리 (yfinance 최신 버전 대응)
        if isinstance(data.columns, pd.MultiIndex):
            data.columns = [col[0] for col in data.columns]

        # 컬럼명 소문자 + 언더스코어 정규화
        data.columns = [col.lower().replace(" ", "_") for col in data.columns]
        data = data.reset_index()
        data["symbol"] = ticker

        # date 컬럼 정규화
        if "date" not in data.columns and "datetime" in data.columns:
            data = data.rename(columns={"datetime": "date"})

        # adj_close가 없으면 close를 사용
        if "adj_close" not in data.columns:
            data["adj_close"] = data["close"]

        logger.info(f"{ticker} 데이터 {len(data)}개 로딩 완료")
        return data

    except Exception as e:
        logger.error(f"{ticker} 데이터 다운로드 실패: {e}")
        return pd.DataFrame()


async def save_to_database(pool: asyncpg.Pool, df: pd.DataFrame) -> int:
    """가격 데이터를 DB에 저장

    Args:
        pool: 데이터베이스 연결 풀
        df: 저장할 DataFrame

    Returns:
        int: 저장된 행 수
    """
    if df.empty:
        return 0

    saved_count = 0

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
                        int(row["volume"]),
                        float(row["adj_close"])
                    )
                    saved_count += 1
                except Exception as e:
                    logger.error(f"행 저장 실패: {e}, row: {row}")

    return saved_count


async def load_all_history():
    """모든 ETF의 10년 과거 데이터 로딩"""
    end_date = datetime.now()
    start_date = end_date - timedelta(days=365 * 10)

    start_str = start_date.strftime("%Y-%m-%d")
    end_str = end_date.strftime("%Y-%m-%d")

    logger.info(f"과거 데이터 로딩 시작: {start_str} ~ {end_str}")
    logger.info(f"대상 티커: {', '.join(TICKERS)}")

    # 데이터베이스 연결
    pool = await asyncpg.create_pool(dsn=settings.DATABASE_URL, min_size=2, max_size=5)

    try:
        total_saved = 0

        for ticker in TICKERS:
            # 데이터 다운로드
            df = await fetch_price_data(ticker, start_str, end_str)

            if not df.empty:
                # DB에 저장
                saved = await save_to_database(pool, df)
                total_saved += saved
                logger.info(f"{ticker}: {saved}개 행 저장 완료")

            # API rate limit 방지를 위한 짧은 대기
            await asyncio.sleep(0.5)

        logger.info(f"전체 완료: 총 {total_saved}개 행 저장")

    except Exception as e:
        logger.error(f"데이터 로딩 실패: {e}")
        raise
    finally:
        await pool.close()


if __name__ == "__main__":
    asyncio.run(load_all_history())
