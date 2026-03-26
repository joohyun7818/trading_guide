// ==================== 공통 ====================

export type QuizStage = 'quiz' | 'terms' | 'advanced' | 'simulation' | 'loading' | 'results'
export type DetailLevel = 'beginner' | 'intermediate' | 'advanced'

export interface Allocation {
  stocks: number
  bonds: number
  cash: number
}

// ==================== 퀴즈 ====================

export interface QuizOption {
  value: string
  label: string
  riskWeight?: number
  tooltip?: string
}

export type QuestionCategory = 'basic' | 'terms' | 'advanced'

export interface QuizQuestion {
  id: string
  title: string
  description?: string
  category: QuestionCategory
  options: QuizOption[]
  helper?: string
}

export interface QuizAnswer {
  questionId: string
  answer: string
}

export interface QuizSubmission {
  sessionId: string
  answers: QuizAnswer[]
}

// 백엔드 /api/quiz/start 응답 (QuizStartResponse)
export interface QuizStartResponse {
  session_id: string
  questions: Array<{
    id: string
    text: string
    options: Array<{ value: string; label: string }>
  }>
}

// 백엔드 /api/quiz/answer 응답
export interface QuizAnswerResponse {
  session_id: string
  risk_score: number
  message: string
}

// 백엔드 /api/quiz/terms 응답
export interface QuizTermsResponse {
  session_id: string
  expertise_level: string
  should_show_advanced: boolean
  advanced_questions: Array<{
    id: string
    text: string
    options: Array<{ value: string; label: string }>
  }>
}

// 백엔드 /api/quiz/advanced 응답 (QuizResultResponse)
export interface QuizResultResponse {
  session_id: string
  risk_score: number
  expertise_level: string
  strategy_key: string
  detail_level: DetailLevel
}

// 프론트엔드 내부 세션 상태
export interface StrategyRecommendation {
  label: string
  allocation: Allocation
  gapType?: 'aligned' | 'moderate_high' | 'high_risk' | 'moderate_low' | 'low_risk'
  explanation?: string
}

export interface QuizSession {
  sessionId: string
  stage: QuizStage
  questions?: QuizQuestion[]
  answers?: Record<string, string>
  riskScore?: number
  strategy?: StrategyRecommendation
}

// ==================== 시뮬레이션 ====================

// 백엔드 SimulationScenario 응답
export interface SimulationScenarioResponse {
  key: string
  name: string
  description: string
  ticker: string
  decision_date: string
  chart_start: string
  chart_end: string
  question: string
  context: Record<string, number>
  news_negative: string[]
  news_positive: string[]
  market_type: string
  action_scores: Record<string, number>
  chart: Array<{
    date: string
    open: number
    high: number
    low: number
    close: number
    volume: number
    adj_close: number
  }>
}

// 백엔드 /api/simulation/start 응답 (SimulationStartResponse)
export interface SimulationStartResponse {
  session_id: string
  scenarios: SimulationScenarioResponse[]
}

// 백엔드 /api/simulation/answer 응답
export interface SimulationAnswerResponse {
  session_id: string
  scenario_key: string
  action: string
  action_score: number
  aftermath: Record<string, number>
  message: string
}

// 백엔드 /api/simulation/complete 응답 (SimulationCompleteResponse)
export interface EquityDetail {
  sector_weights: Record<string, number>
  leverage_allowed: boolean
  macro_weight: number
}

export interface StrategyResponse {
  strategy_name: string
  description: string
  asset_allocation: Allocation
  equity_detail: EquityDetail
  rebalance_frequency: string
  max_drawdown_tolerance: number
  reasoning: string
}

export interface SimulationCompleteResponse {
  action_risk_score: number
  calibrated_risk_score: number
  gap_type: string
  gap: number
  message: string
  strategy: StrategyResponse
}

// 프론트엔드 내부용 시뮬레이션 타입 (하위 호환 유지)
export interface SimulationScenario {
  id: string
  title: string
  date: string
  narrative: string
  sentiment: 'fear' | 'neutral' | 'greed'
  keyInsight?: string
}

export interface SimulationSession {
  sessionId: string
  scenario: SimulationScenario
  scenarios?: SimulationScenarioResponse[]   // 전체 시나리오 목록
  currentIndex?: number                       // 현재 시나리오 인덱스
  actions?: SimulationActionDetail[]
  score?: number
}

export interface SimulationActionPayload {
  session_id: string
  scenario_key: string
  action: 'buy' | 'hold' | 'sell'
}

export interface SimulationActionDetail {
  scenarioId: string
  action: SimulationActionPayload['action']
  impact: number
  rationale?: string
}

export interface SimulationResult {
  sessionId: string
  score: number
  actions: SimulationActionDetail[]
  nextScenario?: SimulationScenario
  completeResponse?: SimulationCompleteResponse
}

// ==================== 백테스트 ====================

export interface PerformancePoint {
  date: string
  value: number
}

// 백엔드 /api/backtest/run 응답 metrics 구조
export interface BacktestMetricsResponse {
  total_return: number
  cagr: number
  mdd: number
  sharpe_ratio: number
  sortino_ratio: number
  calmar_ratio: number
  win_rate: number
  best_month: number
  worst_month: number
  benchmark_return: number
  annual_return?: number
  volatility?: number
}

// 백엔드 단일 기간 백테스트 결과
export interface BacktestPeriodResult {
  period: string
  metrics: BacktestMetricsResponse
  daily_equity: PerformancePoint[]
  benchmark_equity: PerformancePoint[]
  allocation?: Allocation
}

// 프론트엔드 내부용 (표시용)
export interface BacktestResult {
  sessionId: string
  cagr: number
  sharpe: number
  mdd: number
  totalReturn: number
  winRate?: number
  volatility?: number
  equityCurve?: PerformancePoint[]
  benchmarkCurve?: PerformancePoint[]
  allocation?: Allocation
  periods?: BacktestPeriodResult[]
  detailLevel?: DetailLevel
}

// ==================== 스트레스 테스트 ====================

export interface StressPeriodResult {
  label: string
  return: number
  recoveryMonths?: number
  commentary?: string
  // 백엔드 응답 필드
  period_key?: string
  period_name?: string
  my_return?: number
  sp500_return?: number
  excess_return?: number
  recovery_months?: number
}

export interface StressTestResult {
  sessionId: string
  periods: StressPeriodResult[]
  detailLevel?: DetailLevel
}

// ==================== AI 응답 ====================

export interface CommentaryResponse {
  headline: string
  summary: string
  period_analysis?: Array<{ period?: string; insight?: string; title?: string }>
  risk_warning?: string
  fun_fact?: string
}

export interface StoryResponse {
  title: string
  story: string
  lesson: string
  emoji: string
}

export interface ImageResponse {
  image_url?: string
  placeholder?: string
  mime_type?: string
}
