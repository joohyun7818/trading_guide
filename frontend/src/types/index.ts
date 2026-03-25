export type QuizStage = 'quiz' | 'terms' | 'advanced' | 'simulation' | 'loading' | 'results'

export interface Allocation {
  stocks: number
  bonds: number
  cash: number
}

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
  actions?: SimulationActionDetail[]
  score?: number
}

export interface SimulationActionPayload {
  sessionId: string
  scenarioId: string
  action: 'buy' | 'hold' | 'sell' | 'rebalance'
  confidence?: number
  notes?: string
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
}

export interface PerformancePoint {
  date: string
  value: number
}

export interface BacktestResult {
  sessionId: string
  cagr: number
  sharpe: number
  mdd: number
  totalReturn: number
  winRate?: number
  volatility?: number
  equityCurve?: PerformancePoint[]
  allocation?: Allocation
}

export interface StressPeriodResult {
  label: string
  return: number
  recoveryMonths?: number
  commentary?: string
}

export interface StressTestResult {
  sessionId: string
  periods: StressPeriodResult[]
}

export interface CommentaryResponse {
  sessionId: string
  headline?: string
  summary: string
  bullets?: string[]
}

export interface StoryResponse {
  sessionId: string
  summary: string
  tone?: string
}

export interface ImageResponse {
  sessionId: string
  url: string
  alt: string
}
