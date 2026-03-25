"""
AlphaFlow US v2 - Pydantic 스키마
Request/Response 모델 정의
"""
from typing import Literal, Optional
from uuid import UUID
from pydantic import BaseModel, Field


# ================= Quiz Schemas =================

class QuizQuestion(BaseModel):
    """퀴즈 질문"""
    id: str
    text: str
    options: list[dict[str, str]]


class QuizStartResponse(BaseModel):
    """퀴즈 시작 응답"""
    session_id: UUID
    questions: list[QuizQuestion]


class QuizAnswerRequest(BaseModel):
    """기본 퀴즈 응답 제출"""
    session_id: UUID
    answers: dict[str, int] = Field(..., description="Q1~Q5 응답 (key: question_id, value: score)")


class QuizTermCheckRequest(BaseModel):
    """용어 체크 제출"""
    session_id: UUID
    term_answers: dict[str, bool] = Field(..., description="T1~T5 응답 (key: term_id, value: knows)")


class QuizAdvancedRequest(BaseModel):
    """고급 질문 응답 제출"""
    session_id: UUID
    advanced_answers: dict[str, int] = Field(..., description="Q6~Q10 응답")


class QuizResultResponse(BaseModel):
    """퀴즈 완료 결과"""
    session_id: UUID
    risk_score: int
    expertise_level: str
    strategy_key: str
    detail_level: str


# ================= Simulation Schemas =================

class SimulationStartRequest(BaseModel):
    """시뮬레이션 시작 요청"""
    quiz_session_id: UUID
    scenario_count: Optional[int] = Field(None, description="선택할 시나리오 수 (옵션)")


class SimulationScenario(BaseModel):
    """시뮬레이션 시나리오"""
    key: str
    name: str
    description: str
    ticker: str
    decision_date: str
    chart_start: str
    chart_end: str
    question: str
    context: dict
    news_negative: list[str]
    news_positive: list[str]
    market_type: str
    action_scores: dict[str, int]
    chart: list[dict] = Field(default_factory=list, description="차트 데이터 (OHLCV)")


class SimulationStartResponse(BaseModel):
    """시뮬레이션 시작 응답"""
    session_id: UUID
    scenarios: list[SimulationScenario]


class SimulationAnswerRequest(BaseModel):
    """시뮬레이션 응답 제출"""
    session_id: UUID
    scenario_key: str
    action: Literal["buy", "hold", "sell"]


class SimulationCompleteResponse(BaseModel):
    """시뮬레이션 완료 응답"""
    action_risk_score: int
    calibrated_risk_score: int
    gap_type: str
    gap: int
    message: str
    strategy: "StrategyResponse"


# ================= Backtest Schemas =================

class BacktestRunRequest(BaseModel):
    """백테스트 실행 요청"""
    session_id: UUID


class BacktestMetrics(BaseModel):
    """백테스트 지표"""
    total_return: float
    annual_return: float
    sharpe_ratio: float
    max_drawdown: float
    win_rate: float
    volatility: float


class BacktestResultResponse(BaseModel):
    """백테스트 결과 응답"""
    period: str
    metrics: BacktestMetrics
    daily_equity: dict[str, float] = Field(..., description="일별 자산 추이")
    benchmark_equity: dict[str, float] = Field(..., description="벤치마크 자산 추이")


# ================= Stress Test Schemas =================

class StressTestResult(BaseModel):
    """스트레스 테스트 결과"""
    period_key: str
    period_name: str
    my_return: float
    sp500_return: float
    excess_return: float
    recovery_months: int


# ================= AI Commentary Schemas =================

class AICommentaryResponse(BaseModel):
    """AI 코멘터리 응답"""
    headline: str
    summary: str
    period_analysis: str
    risk_warning: str
    fun_fact: str


class AIStoryResponse(BaseModel):
    """AI 스토리 응답"""
    title: str
    story: str
    lesson: str
    emoji: str


class AIImageResponse(BaseModel):
    """AI 이미지 생성 응답"""
    image_url: Optional[str] = None
    placeholder: Optional[str] = None


# ================= Strategy Schemas =================

class EquityDetail(BaseModel):
    """주식 상세"""
    sector_weights: dict[str, float]
    leverage_allowed: bool = False
    macro_weight: float = 0.0


class StrategyResponse(BaseModel):
    """전략 응답"""
    strategy_name: str
    description: str
    asset_allocation: dict[str, float] = Field(..., description="자산 배분 (stocks, bonds, cash)")
    equity_detail: EquityDetail
    rebalance_frequency: str
    max_drawdown_tolerance: float
    reasoning: str


# ================= Common Schemas =================

class HealthResponse(BaseModel):
    """헬스체크 응답"""
    status: str
    database: str
    version: str


class ErrorResponse(BaseModel):
    """에러 응답"""
    error: str
    detail: Optional[str] = None


# Forward reference 해결
SimulationCompleteResponse.model_rebuild()
