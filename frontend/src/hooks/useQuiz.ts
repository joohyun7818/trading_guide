import { useCallback, useMemo, useState } from 'react'
import {
  startQuiz,
  submitAdvanced,
  submitAnswers,
  submitTerms,
} from '../api/client'
import type {
  QuestionCategory,
  QuizQuestion,
  QuizStage,
  QuizSubmission,
  QuizSession,
} from '../types'

const stepOrder: QuizStage[] = [
  'quiz',
  'terms',
  'advanced',
  'simulation',
  'loading',
  'results',
]

const defaultQuestions: QuizQuestion[] = [
  {
    id: 'q1',
    title: '투자 목표는 무엇인가요?',
    description: '목표에 따라 위험 허용도와 기간이 달라집니다.',
    category: 'basic',
    options: [
      { value: 'preserve', label: '원금 보존이 최우선' },
      { value: 'balance', label: '안정과 성장을 균형 있게' },
      { value: 'growth', label: '높은 수익을 위해 변동성 감수' },
    ],
  },
  {
    id: 'q2',
    title: '예상 투자 기간은 얼마나 되나요?',
    description: '기간이 길수록 단기 변동을 감내할 수 있습니다.',
    category: 'basic',
    options: [
      { value: 'short', label: '1년 미만' },
      { value: 'mid', label: '1~3년' },
      { value: 'long', label: '3년 이상' },
    ],
  },
  {
    id: 'q3',
    title: '손실 허용 범위는?',
    description: '투자 성향을 정밀하게 측정하기 위한 기본 질문입니다.',
    category: 'basic',
    options: [
      { value: 'low', label: '5% 이내' },
      { value: 'medium', label: '10~15%' },
      { value: 'high', label: '20% 이상도 가능' },
    ],
  },
  {
    id: 't1',
    title: 'MDD(Maximum Drawdown)를 알고 계신가요?',
    description: '최대 낙폭을 의미합니다. 투자 리스크 판단에 중요합니다.',
    category: 'terms',
    options: [
      { value: 'yes', label: '예, 이해하고 있어요', tooltip: '투자 기간 중 최고점 대비 최대 하락률' },
      { value: 'no', label: '아니요, 처음 들어요' },
    ],
  },
  {
    id: 't2',
    title: '샤프 비율이 무엇을 의미하나요?',
    description: '수익 대비 변동성(위험)을 나타내는 대표 지표입니다.',
    category: 'terms',
    options: [
      { value: 'risk-adjusted', label: '위험 대비 수익률', tooltip: '수익률에서 무위험 수익률을 뺀 후 변동성으로 나눈 값' },
      { value: 'volatility', label: '단순 변동성' },
    ],
  },
  {
    id: 'a1',
    title: '선호하는 섹터가 있나요?',
    description: '고급 설정으로 전략 미세 조정에 활용됩니다.',
    category: 'advanced',
    options: [
      { value: 'tech', label: '테크/성장주' },
      { value: 'value', label: '가치/배당주' },
      { value: 'defensive', label: '방어주/필수소비재' },
    ],
  },
  {
    id: 'a2',
    title: '허용 가능한 MDD 한도는?',
    description: '전략 리스크 상한을 설정합니다.',
    category: 'advanced',
    options: [
      { value: '5', label: '5% 이하' },
      { value: '10', label: '10~15%' },
      { value: '20', label: '20% 이상' },
    ],
  },
]

const stageToCategory: Record<QuizStage, QuestionCategory | null> = {
  quiz: 'basic',
  terms: 'terms',
  advanced: 'advanced',
  simulation: null,
  loading: null,
  results: null,
}

const getSessionId = (session?: QuizSession | null) =>
  session?.sessionId || localStorage.getItem('alphaflow-session') || 'local'

export function useQuiz() {
  const [session, setSession] = useState<QuizSession | null>(null)
  const [stage, setStage] = useState<QuizStage>('quiz')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const questions = useMemo(
    () => (session?.questions?.length ? session.questions : defaultQuestions),
    [session],
  )

  const currentCategory = stageToCategory[stage]
  const currentQuestions = useMemo(
    () =>
      currentCategory
        ? questions.filter((question) => question.category === currentCategory)
        : [],
    [questions, currentCategory],
  )

  const progress = useMemo(() => {
    const currentIndex = stepOrder.findIndex((item) => item === stage)
    const ratio = currentIndex < 0 ? 0 : currentIndex / (stepOrder.length - 1)
    return Math.round(ratio * 100)
  }, [stage])

  const persistSession = useCallback((data: QuizSession | null) => {
    if (data?.sessionId) {
      localStorage.setItem('alphaflow-session', data.sessionId)
    }
  }, [])

  const start = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await startQuiz()
      setSession(data)
      setStage(data.stage ?? 'quiz')
      setAnswers(data.answers ?? {})
      persistSession(data)
      return data
    } catch {
      setError('퀴즈를 불러오는 데 실패했습니다. 샘플 질문으로 계속합니다.')
      const fallback: QuizSession = { sessionId: 'local', stage: 'quiz', questions: defaultQuestions }
      setSession(fallback)
      persistSession(fallback)
      return fallback
    } finally {
      setLoading(false)
    }
  }, [persistSession])

  const updateAnswer = useCallback((questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }, [])

  const submitStep = useCallback(
    async (targetStage: QuizStage, submitFn: () => Promise<QuizSession>) => {
      setLoading(true)
      setError(null)
      try {
        const data = await submitFn()
        setSession(data)
        setStage(data.stage ?? targetStage)
        persistSession(data)
        return data
      } catch {
        setError('응답 저장에 실패했습니다. 연결을 확인하세요.')
        setStage(targetStage)
        return null
      } finally {
        setLoading(false)
      }
    },
    [persistSession],
  )

  const buildSubmission = useCallback(
    (category: QuestionCategory): QuizSubmission => {
      const sessionId = getSessionId(session)
      const payload = Object.entries(answers)
        .filter(([questionId]) => {
          const target = questions.find((question) => question.id === questionId)
          return target?.category === category
        })
        .map(([questionId, answer]) => ({ questionId, answer }))

      return {
        sessionId,
        answers: payload,
      }
    },
    [answers, questions, session],
  )

  const submitBasic = useCallback(() => {
    const payload = buildSubmission('basic')
    return submitStep('terms', () => submitAnswers(payload))
  }, [buildSubmission, submitStep])

  const submitTermsStep = useCallback(() => {
    const payload = buildSubmission('terms')
    return submitStep('advanced', () => submitTerms(payload))
  }, [buildSubmission, submitStep])

  const submitAdvancedStep = useCallback(() => {
    const payload = buildSubmission('advanced')
    return submitStep('simulation', () => submitAdvanced(payload))
  }, [buildSubmission, submitStep])

  const reset = useCallback(() => {
    setStage('quiz')
    setAnswers({})
    setSession(null)
    setError(null)
  }, [])

  return {
    session,
    stage,
    questions,
    currentQuestions,
    answers,
    updateAnswer,
    progress,
    loading,
    error,
    start,
    submitBasic,
    submitTermsStep,
    submitAdvancedStep,
    reset,
    sessionId: getSessionId(session),
    riskScore: session?.riskScore,
  }
}
