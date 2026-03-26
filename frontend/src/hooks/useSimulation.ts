/**
 * useSimulation - 시뮬레이션 훅
 * 백엔드 /api/simulation/* 엔드포인트와 연동
 */
import { useCallback, useMemo, useState } from 'react'
import {
  startSimulation,
  submitSimulationAnswer,
  completeSimulation,
} from '../api/client'
import type {
  SimulationScenario,
  SimulationSession,
  SimulationScenarioResponse,
  SimulationCompleteResponse,
} from '../types'

const SESSION_KEY = 'alphaflow-session'
const SIM_SESSION_KEY = 'alphaflow-sim-session'

/** 백엔드 SimulationScenarioResponse → 프론트 SimulationScenario 변환 */
function toFrontScenario(s: SimulationScenarioResponse): SimulationScenario {
  // market_type 기반 sentiment 매핑
  const sentimentMap: Record<string, 'fear' | 'neutral' | 'greed'> = {
    down: 'fear',
    up: 'greed',
    mixed: 'neutral',
  }
  return {
    id: s.key,
    title: s.name,
    date: s.decision_date,
    narrative: s.description,
    sentiment: sentimentMap[s.market_type] ?? 'neutral',
    keyInsight: s.question,
  }
}

const fallbackScenario: SimulationScenario = {
  id: 'covid_crash_week2',
  title: '코로나 폭락 2주차',
  date: '2020-03-13',
  narrative: '팬데믹 선언과 서킷 브레이커 발동, 공포가 극대화된 상황입니다.',
  sentiment: 'fear',
  keyInsight: '급락 후 반등 가능성 vs 추가 하락 리스크를 균형 있게 고려해야 합니다.',
}

export function useSimulation() {
  const [session, setSession] = useState<SimulationSession | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [completeResult, setCompleteResult] = useState<SimulationCompleteResponse | null>(null)
  // 현재 표시 중인 시나리오 인덱스
  const [currentIndex, setCurrentIndex] = useState(0)
  // 각 시나리오별 aftermath 결과 저장
  const [aftermathMap, setAftermathMap] = useState<Record<string, Record<string, number>>>({})

  // 퀴즈 세션 ID (시뮬레이션 시작 시 전달)
  const quizSessionId = useMemo(
    () => localStorage.getItem(SESSION_KEY) || 'local',
    [],
  )

  // 시뮬레이션 세션 ID
  const sessionId = useMemo(
    () => session?.sessionId || localStorage.getItem(SIM_SESSION_KEY) || '',
    [session],
  )

  // 현재 표시 중인 시나리오
  const scenario = useMemo((): SimulationScenario => {
    const scenarios = session?.scenarios
    if (!scenarios || scenarios.length === 0) return fallbackScenario
    const idx = Math.min(currentIndex, scenarios.length - 1)
    return toFrontScenario(scenarios[idx])
  }, [session, currentIndex])

  // 전체 시나리오 수
  const totalScenarios = useMemo(() => session?.scenarios?.length ?? 0, [session])

  // 완료 여부
  const isLastScenario = useMemo(
    () => totalScenarios > 0 && currentIndex >= totalScenarios - 1,
    [currentIndex, totalScenarios],
  )

  /** 시뮬레이션 시작 */
  const start = useCallback(
    async (quizSessId?: string) => {
      const targetId = quizSessId || quizSessionId
      setLoading(true)
      setError(null)
      try {
        const data = await startSimulation(targetId)
        const simSessionId = data.session_id.toString()
        localStorage.setItem(SIM_SESSION_KEY, simSessionId)

        const newSession: SimulationSession = {
          sessionId: simSessionId,
          scenario: data.scenarios.length > 0 ? toFrontScenario(data.scenarios[0]) : fallbackScenario,
          scenarios: data.scenarios,
          currentIndex: 0,
        }
        setSession(newSession)
        setCurrentIndex(0)
        setAftermathMap({})
        return newSession
      } catch {
        setError('시뮬레이션을 불러오는 데 실패했습니다. 샘플 시나리오로 진행합니다.')
        const fallback: SimulationSession = {
          sessionId: targetId,
          scenario: fallbackScenario,
          scenarios: [],
        }
        setSession(fallback)
        return fallback
      } finally {
        setLoading(false)
      }
    },
    [quizSessionId],
  )

  /** 시나리오 답변 제출 */
  const submitAction = useCallback(
    async (action: 'buy' | 'hold' | 'sell') => {
      if (!sessionId) {
        setError('시뮬레이션 세션이 없습니다. 다시 시작해주세요.')
        return null
      }
      const currentScenarioKey = scenario.id

      setLoading(true)
      setError(null)
      try {
        const data = await submitSimulationAnswer(sessionId, currentScenarioKey, action)
        // aftermath 저장
        setAftermathMap((prev) => ({
          ...prev,
          [currentScenarioKey]: data.aftermath,
        }))
        // 다음 시나리오로 이동
        if (!isLastScenario) {
          setCurrentIndex((prev) => prev + 1)
        }
        return data
      } catch {
        setError('답변을 저장하지 못했습니다. 다시 시도해주세요.')
        return null
      } finally {
        setLoading(false)
      }
    },
    [sessionId, scenario.id, isLastScenario],
  )

  /** 시뮬레이션 완료 처리 */
  const finalize = useCallback(async () => {
    if (!sessionId) {
      setError('시뮬레이션 세션이 없습니다.')
      return null
    }
    setLoading(true)
    setError(null)
    try {
      const data = await completeSimulation(sessionId)
      setCompleteResult(data)
      return data
    } catch {
      setError('시뮬레이션을 완료하지 못했습니다. 다시 시도해주세요.')
      return null
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  return {
    quizSessionId,
    sessionId,
    scenario,
    scenarios: session?.scenarios ?? [],
    currentIndex,
    totalScenarios,
    isLastScenario,
    aftermathMap,
    loading,
    error,
    completeResult,
    start,
    submitAction,
    finalize,
  }
}
