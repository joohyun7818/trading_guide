import { useCallback, useMemo, useState } from 'react'
import {
  completeSimulation,
  startSimulation,
  submitSimulationAction,
} from '../api/client'
import type {
  SimulationActionDetail,
  SimulationActionPayload,
  SimulationResult,
  SimulationScenario,
  SimulationSession,
} from '../types'

const fallbackScenario: SimulationScenario = {
  id: 'covid-2020',
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
  const [result, setResult] = useState<SimulationResult | null>(null)

  const scenario = useMemo(() => session?.scenario ?? fallbackScenario, [session])

  const actions: SimulationActionDetail[] = session?.actions ?? []

  const sessionId = useMemo(
    () => session?.sessionId || localStorage.getItem('alphaflow-session') || 'local',
    [session],
  )

  const start = useCallback(
    async (sessionIdInput?: string) => {
      const targetSession = sessionIdInput || sessionId
      setLoading(true)
      setError(null)
      try {
        const data = await startSimulation(targetSession)
        setSession(data)
        return data
      } catch {
        setError('시뮬레이션을 불러오는 데 실패했습니다. 샘플 시나리오로 진행합니다.')
        const fallback: SimulationSession = { sessionId: targetSession, scenario: fallbackScenario }
        setSession(fallback)
        return fallback
      } finally {
        setLoading(false)
      }
    },
    [sessionId],
  )

  const submitAction = useCallback(
    async (action: Partial<SimulationActionPayload>) => {
      const payload: SimulationActionPayload = {
        sessionId,
        scenarioId: scenario.id,
        action: action.action ?? 'hold',
        confidence: action.confidence,
        notes: action.notes,
      }

      setLoading(true)
      setError(null)
      try {
        const data = await submitSimulationAction(payload)
        setResult(data)
        if (data.nextScenario) {
          setSession({ sessionId, scenario: data.nextScenario, actions: data.actions })
        }
        return data
      } catch {
        setError('액션을 저장하지 못했습니다. 다시 시도해주세요.')
        return null
      } finally {
        setLoading(false)
      }
    },
    [scenario.id, sessionId],
  )

  const finalize = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await completeSimulation(sessionId)
      setResult(data)
      return data
    } catch {
      setError('시뮬레이션을 완료하지 못했습니다. 다시 시도해주세요.')
      return null
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  return {
    sessionId,
    scenario,
    actions,
    loading,
    error,
    result,
    start,
    submitAction,
    finalize,
  }
}
