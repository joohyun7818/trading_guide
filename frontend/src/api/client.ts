/**
 * AlphaFlow US v2 - API 클라이언트
 * 백엔드 FastAPI 엔드포인트와 1:1 매핑
 */
import axios from 'axios'
import type {
  QuizStartResponse,
  QuizAnswerResponse,
  QuizTermsResponse,
  QuizResultResponse,
  SimulationStartResponse,
  SimulationAnswerResponse,
  SimulationCompleteResponse,
  BacktestPeriodResult,
  StressPeriodResult,
  CommentaryResponse,
  StoryResponse,
  ImageResponse,
} from '../types'

const client = axios.create({
  baseURL: '/api',
  timeout: 60000, // 백테스트는 오래 걸릴 수 있음
  headers: {
    'Content-Type': 'application/json',
  },
})

const unwrap = async <T>(promise: Promise<{ data: T }>) => {
  const { data } = await promise
  return data
}

// ==================== 퀴즈 API ====================

/** POST /api/quiz/start - 퀴즈 세션 생성 및 기본 질문 반환 */
export const startQuiz = async () =>
  unwrap<QuizStartResponse>(client.post('/quiz/start'))

/** POST /api/quiz/answer - Q1~Q5 기본 답변 제출 */
export const submitBasicAnswers = async (session_id: string, answers: Record<string, number>) =>
  unwrap<QuizAnswerResponse>(client.post('/quiz/answer', { session_id, answers }))

/** POST /api/quiz/terms - T1~T5 용어 체크 제출 */
export const submitTermAnswers = async (session_id: string, term_answers: Record<string, boolean>) =>
  unwrap<QuizTermsResponse>(client.post('/quiz/terms', { session_id, term_answers }))

/** POST /api/quiz/advanced - Q6~Q10 고급 답변 제출 */
export const submitAdvancedAnswers = async (session_id: string, advanced_answers: Record<string, number | string>) =>
  unwrap<QuizResultResponse>(client.post('/quiz/advanced', { session_id, advanced_answers }))

/** GET /api/quiz/{session_id} - 퀴즈 세션 조회 */
export const getQuizSession = async (session_id: string) =>
  unwrap<QuizResultResponse>(client.get(`/quiz/${session_id}`))

// ==================== 시뮬레이션 API ====================

/** POST /api/simulation/start - 시뮬레이션 세션 시작 */
export const startSimulation = async (quiz_session_id: string, scenario_count?: number) =>
  unwrap<SimulationStartResponse>(
    client.post('/simulation/start', { quiz_session_id, ...(scenario_count !== undefined ? { scenario_count } : {}) })
  )

/** POST /api/simulation/answer - 시나리오 답변 제출 */
export const submitSimulationAnswer = async (
  session_id: string,
  scenario_key: string,
  action: 'buy' | 'hold' | 'sell'
) =>
  unwrap<SimulationAnswerResponse>(
    client.post('/simulation/answer', { session_id, scenario_key, action })
  )

/** POST /api/simulation/complete - 시뮬레이션 완료 및 행동 보정 */
export const completeSimulation = async (session_id: string) =>
  unwrap<SimulationCompleteResponse>(client.post('/simulation/complete', { session_id }))

/** GET /api/simulation/{session_id} - 시뮬레이션 세션 조회 */
export const getSimulationSession = async (session_id: string) =>
  unwrap<SimulationStartResponse>(client.get(`/simulation/${session_id}`))

// ==================== 백테스트 API ====================

/** POST /api/backtest/run - 백테스트 실행 (1y/2y/3y/5y/10y 전 기간) */
export const runBacktest = async (quiz_session_id: string) =>
  unwrap<BacktestPeriodResult[]>(client.post('/backtest/run', { quiz_session_id }))

/** POST /api/backtest/stress-test - 스트레스 테스트 실행 */
export const runStressTest = async (quiz_session_id: string) =>
  unwrap<{ quiz_session_id: string; detail_level: string; results: StressPeriodResult[] }>(
    client.post('/backtest/stress-test', { quiz_session_id })
  )

/** GET /api/backtest/results/{quiz_session_id} - 백테스트 결과 목록 조회 */
export const getBacktestResults = async (quiz_session_id: string) =>
  unwrap<BacktestPeriodResult[]>(client.get(`/backtest/results/${quiz_session_id}`))

/** GET /api/backtest/results/{quiz_session_id}/{period} - 특정 기간 백테스트 결과 */
export const getBacktestResultByPeriod = async (quiz_session_id: string, period: string) =>
  unwrap<BacktestPeriodResult>(client.get(`/backtest/results/${quiz_session_id}/${period}`))

/** GET /api/backtest/stress/{quiz_session_id} - 스트레스 테스트 결과 조회 */
export const getStressResults = async (quiz_session_id: string) =>
  unwrap<StressPeriodResult[]>(client.get(`/backtest/stress/${quiz_session_id}`))

// ==================== AI API ====================

/** POST /api/ai/commentary - AI 코멘터리 생성 */
export const getCommentary = async (quiz_session_id: string) =>
  unwrap<CommentaryResponse>(client.post('/ai/commentary', { quiz_session_id }))

/** POST /api/ai/story/{period_key} - 스트레스 구간 스토리텔링 */
export const getStory = async (quiz_session_id: string, period_key: string) =>
  unwrap<StoryResponse>(client.post(`/ai/story/${period_key}`, { quiz_session_id }))

/** POST /api/ai/image - 전략 캐릭터 이미지 생성 */
export const getImage = async (quiz_session_id: string) =>
  unwrap<ImageResponse>(client.post('/ai/image', { quiz_session_id }))

export default client
