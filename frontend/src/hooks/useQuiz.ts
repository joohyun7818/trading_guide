/**
 * useQuiz - 투자 성향 퀴즈 훅
 * 백엔드 /api/quiz/* 엔드포인트와 연동
 */
import { useCallback, useMemo, useState } from 'react'
import {
  startQuiz,
  submitBasicAnswers,
  submitTermAnswers,
  submitAdvancedAnswers,
} from '../api/client'
import type { QuizStage, QuizSession, QuizQuestion } from '../types'

const stepOrder: QuizStage[] = ['quiz', 'terms', 'advanced', 'simulation', 'loading', 'results']

// ==================== 로컬 폴백 질문 ====================
// 서버 연결 실패 시 기본 질문으로 대체
const fallbackBasicQuestions: QuizQuestion[] = [
  {
    id: 'Q1',
    title: '투자의 주요 목적은 무엇인가요?',
    description: '투자 목적에 따라 성향이 달라집니다.',
    category: 'basic',
    options: [
      { value: '1', label: '노후 대비 안정적인 자산 보존' },
      { value: '2', label: '은퇴 후 생활비를 위한 자산 보존' },
      { value: '3', label: '완만한 자산 성장' },
      { value: '4', label: '적극적인 자산 성장' },
      { value: '5', label: '단기간에 높은 수익 추구' },
    ],
  },
  {
    id: 'Q2',
    title: '투자 기간은 얼마나 되나요?',
    description: '기간이 길수록 위험을 감내할 수 있습니다.',
    category: 'basic',
    options: [
      { value: '5', label: '6개월 미만' },
      { value: '4', label: '1년' },
      { value: '3', label: '3년' },
      { value: '2', label: '5년 이상' },
      { value: '1', label: '10년 이상' },
    ],
  },
  {
    id: 'Q3',
    title: '원금 손실을 얼마나 허용할 수 있나요?',
    description: '손실 허용도가 클수록 공격적 전략이 가능합니다.',
    category: 'basic',
    options: [
      { value: '1', label: '절대 손실 불가 (원금 보장 필수)' },
      { value: '2', label: '최대 5%까지' },
      { value: '3', label: '최대 15%까지' },
      { value: '4', label: '최대 30%까지' },
      { value: '5', label: '50% 이상도 감수 가능' },
    ],
  },
  {
    id: 'Q4',
    title: '투자 경험은 어느 정도인가요?',
    category: 'basic',
    options: [
      { value: '1', label: '전혀 없음' },
      { value: '2', label: '예적금만 해봄' },
      { value: '3', label: '펀드 투자 경험' },
      { value: '4', label: '직접 주식 거래 경험' },
      { value: '5', label: '파생상품/레버리지 경험' },
    ],
  },
  {
    id: 'Q5',
    title: '수익률과 안정성 중 무엇을 우선시하나요?',
    category: 'basic',
    options: [
      { value: '1', label: '안정성 최우선 (변동성 최소화)' },
      { value: '2', label: '안정성 중시' },
      { value: '3', label: '균형 (둘 다 중요)' },
      { value: '4', label: '수익률 중시' },
      { value: '5', label: '수익률 최우선 (고위험 감수)' },
    ],
  },
]

const fallbackTermQuestions: QuizQuestion[] = [
  { id: 'T1', title: 'MDD (최대낙폭)를 알고 계신가요?', description: '투자 기간 동안 발생한 최대 손실률', category: 'terms', options: [{ value: 'true', label: '예, 알고 있어요' }, { value: 'false', label: '처음 들어요' }] },
  { id: 'T2', title: '샤프 비율(Sharpe Ratio)을 알고 계신가요?', description: '위험 대비 수익률을 나타내는 지표', category: 'terms', options: [{ value: 'true', label: '예, 알고 있어요' }, { value: 'false', label: '처음 들어요' }] },
  { id: 'T3', title: '리밸런싱(Rebalancing)을 알고 계신가요?', description: '목표 자산 배분 비율을 유지하기 위해 주기적으로 조정', category: 'terms', options: [{ value: 'true', label: '예, 알고 있어요' }, { value: 'false', label: '처음 들어요' }] },
  { id: 'T4', title: '섹터 로테이션(Sector Rotation)을 알고 계신가요?', description: '경기 사이클에 따라 유망 섹터에 투자하는 전략', category: 'terms', options: [{ value: 'true', label: '예, 알고 있어요' }, { value: 'false', label: '처음 들어요' }] },
  { id: 'T5', title: '레버리지 ETF를 알고 계신가요?', description: '기초 지수 수익률의 2~3배를 추종하는 ETF', category: 'terms', options: [{ value: 'true', label: '예, 알고 있어요' }, { value: 'false', label: '처음 들어요' }] },
]

const fallbackAdvancedQuestions: QuizQuestion[] = [
  { id: 'Q6', title: '선호하는 섹터가 있나요?', category: 'advanced', options: [{ value: 'tech', label: '기술주' }, { value: 'healthcare', label: '헬스케어' }, { value: 'finance', label: '금융' }, { value: 'energy', label: '에너지' }, { value: 'diversified', label: '분산 투자' }] },
  { id: 'Q7', title: '최대 허용 MDD는 얼마인가요?', category: 'advanced', options: [{ value: '1', label: '5% (매우 보수적)' }, { value: '2', label: '10% (보수적)' }, { value: '3', label: '20% (적정)' }, { value: '4', label: '30% (공격적)' }, { value: '5', label: '상관없음 (초공격적)' }] },
  { id: 'Q8', title: '리밸런싱 주기는 어떻게 하시겠습니까?', category: 'advanced', options: [{ value: '5', label: '매주' }, { value: '4', label: '매월' }, { value: '3', label: '분기' }, { value: '2', label: '반기' }, { value: '1', label: '매년' }] },
  { id: 'Q9', title: '레버리지 사용 의향은 어떠신가요?', category: 'advanced', options: [{ value: '1', label: '절대 불가' }, { value: '2', label: '소극적 (5% 이하)' }, { value: '3', label: '보통 (10% 정도)' }, { value: '4', label: '적극적 (20% 이상)' }, { value: '5', label: '올인 (50% 이상)' }] },
  { id: 'Q10', title: '매크로 지표를 얼마나 반영하시겠습니까?', category: 'advanced', options: [{ value: '1', label: '무시 (Buy & Hold)' }, { value: '2', label: '약간 참고' }, { value: '3', label: '보통' }, { value: '4', label: '적극 반영' }, { value: '5', label: '매크로 중심 전략' }] },
]

// 세션 ID 저장/조회
const SESSION_KEY = 'alphaflow-session'

const persistSessionId = (id: string) => {
  if (id && id !== 'local') localStorage.setItem(SESSION_KEY, id)
}

export function useQuiz() {
  const [session, setSession] = useState<QuizSession | null>(null)
  const [stage, setStage] = useState<QuizStage>('quiz')
  // answers: 질문 ID → 선택 값 (문자열 형태로 저장)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  // showAdvanced: 용어 체크 후 고급 질문 표시 여부
  const [showAdvanced, setShowAdvanced] = useState(false)
  // advancedQuestions: 서버에서 받은 고급 질문 (없으면 폴백 사용)
  const [serverAdvancedQuestions, setServerAdvancedQuestions] = useState<QuizQuestion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [riskScore, setRiskScore] = useState<number | undefined>(undefined)
  const [expertiseLevel, setExpertiseLevel] = useState<string>('beginner')

  // 서버에서 받은 기본 질문 (없으면 폴백 사용)
  const [serverBasicQuestions, setServerBasicQuestions] = useState<QuizQuestion[]>([])

  const sessionId = useMemo(
    () => session?.sessionId || localStorage.getItem(SESSION_KEY) || 'local',
    [session],
  )

  const progress = useMemo(() => {
    const idx = stepOrder.findIndex((s) => s === stage)
    return idx < 0 ? 0 : Math.round((idx / (stepOrder.length - 1)) * 100)
  }, [stage])

  // 현재 단계에 표시할 질문 목록
  const currentQuestions = useMemo((): QuizQuestion[] => {
    if (stage === 'quiz') {
      return serverBasicQuestions.length > 0 ? serverBasicQuestions : fallbackBasicQuestions
    }
    if (stage === 'terms') {
      return fallbackTermQuestions
    }
    if (stage === 'advanced') {
      if (!showAdvanced) return []
      return serverAdvancedQuestions.length > 0 ? serverAdvancedQuestions : fallbackAdvancedQuestions
    }
    return []
  }, [stage, serverBasicQuestions, serverAdvancedQuestions, showAdvanced])

  /** 퀴즈 시작 - 세션 생성 및 기본 질문 수신 */
  const start = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await startQuiz()
      const sessionIdStr = data.session_id.toString()
      persistSessionId(sessionIdStr)

      // 서버 질문을 프론트 형식으로 변환
      const convertedQuestions: QuizQuestion[] = data.questions.map((q) => ({
        id: q.id,
        title: q.text,
        category: 'basic' as const,
        options: q.options.map((o) => ({ value: o.value, label: o.label })),
      }))
      setServerBasicQuestions(convertedQuestions)

      const newSession: QuizSession = { sessionId: sessionIdStr, stage: 'quiz' }
      setSession(newSession)
      setStage('quiz')
      return newSession
    } catch {
      setError('서버에 연결하지 못했습니다. 샘플 질문으로 진행합니다.')
      const fallback: QuizSession = { sessionId: 'local', stage: 'quiz' }
      setSession(fallback)
      return fallback
    } finally {
      setLoading(false)
    }
  }, [])

  const updateAnswer = useCallback((questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }, [])

  /** 기본 질문 (Q1~Q5) 제출 */
  const submitBasic = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // answers를 Record<string, number>로 변환 (백엔드 expects int scores)
      const numericAnswers: Record<string, number> = {}
      for (const [qid, val] of Object.entries(answers)) {
        if (qid.startsWith('Q') && !qid.startsWith('T') && !['Q6','Q7','Q8','Q9','Q10'].includes(qid)) {
          const num = parseInt(val, 10)
          if (!isNaN(num)) numericAnswers[qid] = num
        }
      }
      const data = await submitBasicAnswers(sessionId, numericAnswers)
      setRiskScore(data.risk_score)
      setStage('terms')
      return data
    } catch {
      setError('기본 답변 저장에 실패했습니다.')
      setStage('terms') // 오류 시에도 다음 단계로 진행
      return null
    } finally {
      setLoading(false)
    }
  }, [answers, sessionId])

  /** 용어 체크 (T1~T5) 제출 */
  const submitTermsStep = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // T1~T5 답변을 boolean으로 변환
      const termAnswers: Record<string, boolean> = {}
      for (const tq of fallbackTermQuestions) {
        const val = answers[tq.id]
        termAnswers[tq.id] = val === 'true'
      }
      const data = await submitTermAnswers(sessionId, termAnswers)
      setExpertiseLevel(data.expertise_level)
      setShowAdvanced(data.should_show_advanced)

      // 서버에서 받은 고급 질문 저장
      if (data.advanced_questions && data.advanced_questions.length > 0) {
        const converted: QuizQuestion[] = data.advanced_questions.map((q) => ({
          id: q.id,
          title: q.text,
          category: 'advanced' as const,
          options: q.options.map((o) => ({ value: o.value, label: o.label })),
        }))
        setServerAdvancedQuestions(converted)
      }

      if (data.should_show_advanced) {
        setStage('advanced')
      } else {
        // 고급 질문 없으면 시뮬레이션으로
        setStage('simulation')
      }
      return data
    } catch {
      setError('용어 체크 저장에 실패했습니다.')
      setStage('advanced')
      return null
    } finally {
      setLoading(false)
    }
  }, [answers, sessionId])

  /** 고급 질문 (Q6~Q10) 제출 */
  const submitAdvancedStep = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const advancedAnswers: Record<string, number | string> = {}
      for (const qid of ['Q6', 'Q7', 'Q8', 'Q9', 'Q10']) {
        const val = answers[qid]
        if (val !== undefined) {
          // Q6는 string(섹터명), 나머지는 숫자
          if (qid === 'Q6') {
            advancedAnswers[qid] = val
          } else {
            const num = parseInt(val, 10)
            if (!isNaN(num)) advancedAnswers[qid] = num
          }
        }
      }
      const data = await submitAdvancedAnswers(sessionId, advancedAnswers)
      setRiskScore(data.risk_score)
      setStage('simulation')
      return data
    } catch {
      setError('고급 답변 저장에 실패했습니다.')
      setStage('simulation')
      return null
    } finally {
      setLoading(false)
    }
  }, [answers, sessionId])

  const reset = useCallback(() => {
    setStage('quiz')
    setAnswers({})
    setSession(null)
    setError(null)
    setRiskScore(undefined)
    setShowAdvanced(false)
    setServerBasicQuestions([])
    setServerAdvancedQuestions([])
  }, [])

  return {
    session,
    stage,
    currentQuestions,
    answers,
    updateAnswer,
    progress,
    loading,
    error,
    showAdvanced,
    expertiseLevel,
    start,
    submitBasic,
    submitTermsStep,
    submitAdvancedStep,
    reset,
    sessionId,
    riskScore,
  }
}
