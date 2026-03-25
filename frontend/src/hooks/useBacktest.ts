import { useCallback, useMemo, useState } from 'react'
import { getResults, runBacktest, runStressTest } from '../api/client'
import type { BacktestResult, StressTestResult } from '../types'

export function useBacktest() {
  const [backtest, setBacktest] = useState<BacktestResult | null>(null)
  const [stress, setStress] = useState<StressTestResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sessionId = useMemo(
    () => localStorage.getItem('alphaflow-session') || 'local',
    [],
  )

  const fetchResults = useCallback(
    async (id?: string) => {
      const target = id || sessionId
      setLoading(true)
      setError(null)
      try {
        const data = await getResults(target)
        setBacktest(data)
        return data
      } catch {
        setError('결과를 불러오지 못했습니다. 백테스트를 다시 실행해 주세요.')
        return null
      } finally {
        setLoading(false)
      }
    },
    [sessionId],
  )

  const run = useCallback(
    async (id?: string) => {
      const target = id || sessionId
      setLoading(true)
      setError(null)
      try {
        const data = await runBacktest(target)
        setBacktest(data)
        return data
      } catch {
        setError('백테스트 실행에 실패했습니다.')
        return null
      } finally {
        setLoading(false)
      }
    },
    [sessionId],
  )

  const runStress = useCallback(
    async (id?: string) => {
      const target = id || sessionId
      setLoading(true)
      setError(null)
      try {
        const data = await runStressTest(target)
        setStress(data)
        return data
      } catch {
        setError('스트레스 테스트 실행에 실패했습니다.')
        return null
      } finally {
        setLoading(false)
      }
    },
    [sessionId],
  )

  return {
    sessionId,
    backtest,
    stress,
    loading,
    error,
    runBacktest: run,
    runStressTest: runStress,
    fetchResults,
  }
}
