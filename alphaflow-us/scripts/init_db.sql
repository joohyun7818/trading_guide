-- AlphaFlow US v2 - 데이터베이스 초기화 스크립트
-- PostgreSQL 15+

-- Extension 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 1. quiz_sessions 테이블
CREATE TABLE IF NOT EXISTS quiz_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_answers JSONB,
    term_answers JSONB,
    advanced_answers JSONB,
    risk_score INTEGER,
    expertise_level VARCHAR(20),
    strategy_key VARCHAR(30),
    detail_level VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_sessions_created ON quiz_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_strategy ON quiz_sessions(strategy_key);

-- 2. simulation_sessions 테이블
CREATE TABLE IF NOT EXISTS simulation_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_session_id UUID REFERENCES quiz_sessions(id) ON DELETE CASCADE,
    scenarios JSONB NOT NULL,
    actions JSONB,
    action_risk_score INTEGER,
    calibrated_risk_score INTEGER,
    gap_type VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_simulation_sessions_quiz ON simulation_sessions(quiz_session_id);
CREATE INDEX IF NOT EXISTS idx_simulation_sessions_created ON simulation_sessions(created_at DESC);

-- 3. backtest_results 테이블
CREATE TABLE IF NOT EXISTS backtest_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_session_id UUID REFERENCES quiz_sessions(id) ON DELETE CASCADE,
    simulation_id UUID REFERENCES simulation_sessions(id) ON DELETE SET NULL,
    strategy JSONB NOT NULL,
    period VARCHAR(10) NOT NULL,
    metrics JSONB NOT NULL,
    daily_equity JSONB,
    benchmark_equity JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_backtest_results_quiz ON backtest_results(quiz_session_id);
CREATE INDEX IF NOT EXISTS idx_backtest_results_simulation ON backtest_results(simulation_id);
CREATE INDEX IF NOT EXISTS idx_backtest_results_created ON backtest_results(created_at DESC);

-- 4. stress_test_results 테이블
CREATE TABLE IF NOT EXISTS stress_test_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_session_id UUID REFERENCES quiz_sessions(id) ON DELETE CASCADE,
    period_key VARCHAR(50) NOT NULL,
    period_name VARCHAR(100) NOT NULL,
    my_return FLOAT,
    sp500_return FLOAT,
    excess_return FLOAT,
    recovery_months INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stress_test_quiz ON stress_test_results(quiz_session_id);
CREATE INDEX IF NOT EXISTS idx_stress_test_period ON stress_test_results(period_key);

-- 5. ai_cache 테이블
CREATE TABLE IF NOT EXISTS ai_cache (
    cache_key VARCHAR(64) PRIMARY KEY,
    task VARCHAR(50) NOT NULL,
    prompt_hash VARCHAR(64) NOT NULL,
    response_json TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_cache_task ON ai_cache(task);
CREATE INDEX IF NOT EXISTS idx_ai_cache_created ON ai_cache(created_at DESC);

-- 6. price_history 테이블 (yfinance 데이터 저장용)
CREATE TABLE IF NOT EXISTS price_history (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    date DATE NOT NULL,
    open NUMERIC(12, 4),
    high NUMERIC(12, 4),
    low NUMERIC(12, 4),
    close NUMERIC(12, 4),
    volume BIGINT,
    adj_close NUMERIC(12, 4),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(symbol, date)
);

CREATE INDEX IF NOT EXISTS idx_price_history_symbol ON price_history(symbol);
CREATE INDEX IF NOT EXISTS idx_price_history_date ON price_history(date DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_symbol_date ON price_history(symbol, date DESC);

-- 완료 메시지
DO $$
BEGIN
    RAISE NOTICE '데이터베이스 초기화 완료';
END $$;
