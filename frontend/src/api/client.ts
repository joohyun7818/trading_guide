import axios from 'axios'
import type {
  BacktestResult,
  CommentaryResponse,
  ImageResponse,
  QuizSession,
  QuizSubmission,
  SimulationActionPayload,
  SimulationResult,
  SimulationSession,
  StoryResponse,
  StressTestResult,
} from '../types'

const client = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

const unwrap = async <T>(promise: Promise<{ data: T }>) => {
  const { data } = await promise
  return data
}

const withSession = (sessionId: string) => ({
  sessionId,
  session_id: sessionId,
})

export const startQuiz = async () => unwrap<QuizSession>(client.post('/quiz/start'))

export const submitAnswers = async (payload: QuizSubmission) =>
  unwrap<QuizSession>(client.post('/quiz/answer', payload))

export const submitTerms = async (payload: QuizSubmission) =>
  unwrap<QuizSession>(client.post('/quiz/terms', payload))

export const submitAdvanced = async (payload: QuizSubmission) =>
  unwrap<QuizSession>(client.post('/quiz/advanced', payload))

export const startSimulation = async (sessionId: string) =>
  unwrap<SimulationSession>(client.post('/simulation/start', withSession(sessionId)))

export const submitSimulationAction = async (payload: SimulationActionPayload) =>
  unwrap<SimulationResult>(client.post('/simulation/answer', payload))

export const completeSimulation = async (sessionId: string) =>
  unwrap<SimulationResult>(client.post('/simulation/complete', withSession(sessionId)))

export const runBacktest = async (sessionId: string) =>
  unwrap<BacktestResult>(client.post('/backtest/run', withSession(sessionId)))

export const runStressTest = async (sessionId: string) =>
  unwrap<StressTestResult>(client.post('/stress/run', withSession(sessionId)))

export const getResults = async (sessionId: string) =>
  unwrap<BacktestResult>(client.get(`/results/${sessionId}`))

export const getCommentary = async (sessionId: string) =>
  unwrap<CommentaryResponse>(client.get(`/ai/commentary/${sessionId}`))

export const getStory = async (sessionId: string) =>
  unwrap<StoryResponse>(client.get(`/ai/story/${sessionId}`))

export const getImage = async (sessionId: string) =>
  unwrap<ImageResponse>(client.get(`/ai/image/${sessionId}`))

export default client
