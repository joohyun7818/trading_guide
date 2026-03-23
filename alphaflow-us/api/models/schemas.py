"""
AlphaFlow US v2 - Pydantic §§» X
®‡ Request/Response ®x X
"""
from typing import Literal, Optional
from uuid import UUID
from pydantic import BaseModel, Field


# ==================== Quiz Schemas ====================

class QuizQuestion(BaseModel):
    """4à »8"""
    id: str
    text: str
    options: list[dict[str, str]]


class QuizStartResponse(BaseModel):
    """4à ‹ë Qı"""
    session_id: UUID
    questions: list[QuizQuestion]


class QuizAnswerRequest(BaseModel):
    """0¯ 4à ı¿ î≠"""
    session_id: UUID
    answers: dict[str, int] = Field(..., description="Q1~Q5 ı¿ (key: question_id, value: score)")


class QuizTermCheckRequest(BaseModel):
    """©¥ ¥l î≠"""
    session_id: UUID
    term_answers: dict[str, bool] = Field(..., description="T1~T5 ı¿ (key: term_id, value: knows)")


class QuizAdvancedRequest(BaseModel):
    """‡	 »8 ı¿ î≠"""
    session_id: UUID
    advanced_answers: dict[str, int] = Field(..., description="Q6~Q10 ı¿")


class QuizResultResponse(BaseModel):
    """4à \Ö ∞¸"""
    session_id: UUID
    risk_score: int
    expertise_level: str
    strategy_key: str
    detail_level: str


# ==================== Simulation Schemas ====================

class SimulationScenario(BaseModel):
    """‹¨tX ‹ò¨$"""
    key: str
    name: str
    description: str
    ticker: str
    question: str
    context: dict


class SimulationStartResponse(BaseModel):
    """‹¨tX ‹ë Qı"""
    session_id: UUID
    scenarios: list[SimulationScenario]


class SimulationAnswerRequest(BaseModel):
    """‹¨tX ı¿ î≠"""
    session_id: UUID
    scenario_key: str
    action: Literal["buy", "hold", "sell"]


class SimulationCompleteResponse(BaseModel):
    """‹¨tX DÃ Qı"""
    action_risk_score: int
    calibrated_risk_score: int
    gap_type: str
    message: str


# ==================== Backtest Schemas ====================

class BacktestRunRequest(BaseModel):
    """1L§∏ ‰â î≠"""
    session_id: UUID


class BacktestMetrics(BaseModel):
    """1L§∏ ¿\"""
    total_return: float
    annual_return: float
    sharpe_ratio: float
    max_drawdown: float
    win_rate: float
    volatility: float


class BacktestResultResponse(BaseModel):
    """1L§∏ ∞¸ Qı"""
    period: str
    metrics: BacktestMetrics
    daily_equity: dict[str, float] = Field(..., description="†‹ƒ ê∞ · ")
    benchmark_equity: dict[str, float] = Field(..., description="§X»l ê∞ · ")


# ==================== Stress Test Schemas ====================

class StressTestResult(BaseModel):
    """§∏§ L§∏ ∞¸"""
    period_key: str
    period_name: str
    my_return: float
    sp500_return: float
    excess_return: float
    recovery_months: int


# ==================== AI Commentary Schemas ====================

class AICommentaryResponse(BaseModel):
    """AI t$ Qı"""
    headline: str
    summary: str
    period_analysis: str
    risk_warning: str
    fun_fact: str


class AIStoryResponse(BaseModel):
    """AI §†¨ Qı"""
    title: str
    story: str
    lesson: str
    emoji: str


class AIImageResponse(BaseModel):
    """AI t¯¿ Qı"""
    image_url: Optional[str] = None
    placeholder: Optional[str] = None


# ==================== Strategy Schemas ====================

class EquityDetail(BaseModel):
    """¸› ¡8 `˘"""
    sector_weights: dict[str, float]
    leverage_allowed: bool = False
    macro_weight: float = 0.0


class StrategyResponse(BaseModel):
    """µ Qı"""
    strategy_name: str
    description: str
    asset_allocation: dict[str, float] = Field(..., description="ê∞ 0Ñ (stocks, bonds, cash)")
    equity_detail: EquityDetail
    rebalance_frequency: str
    max_drawdown_tolerance: float
    reasoning: str


# ==================== Common Schemas ====================

class HealthResponse(BaseModel):
    """Ï§¥l Qı"""
    status: str
    database: str
    version: str


class ErrorResponse(BaseModel):
    """–Ï Qı"""
    error: str
    detail: Optional[str] = None
