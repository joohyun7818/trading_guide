/**
 * useBacktest - 백테스트 / 스트레스 테스트 훅
 * 백엔드 /api/backtest/* 엔드포인트와 연동
 */
import { useCallback, useMemo, useState } from 'react'
import {
  runBacktest,
  runStressTest,
  getBacktestResults,
} from '../api/client'
import type {
  BacktestResult,
  BacktestPeriodResult,
  StressTestResult,
  StressPeriodResult,
  PerformancePoint,
  DetailLevel,
} from '../types'

const SESSION_KEY = 'alphaflow-session'

/** 백엔드 BacktestPeriodResult[] → 프론트 BacktestResult 변환 (최신 기간 기준) */
function toFrontBacktest(periods: BacktestPeriodResult[], sessionId: string): BacktestResult {
  // 10y 기간 우선, 없으면 가장 긴 기간 사용
  const preferOrder = ['10y', '5y', '3y', '2y', '1y']
  const best = preferOrder.map((p) => periods.find((r) => r.period === p)).find(Boolean) ?? periods[0]

  if (!best) {
    return { sessionId, cagr: 0, sharpe: 0, mdd: 0, totalReturn: 0 }
  }

  const m = best.metrics
  const equityCurve: PerformancePoint[] = (best.daily_equity ?? []).map((d) => ({
    date: d.date,
    value: d.value,
  }))
  const benchmarkCurve: PerformancePoint[] = (best.benchmark_equity ?? []).map((d) => ({
    date: d.date,
    value: d.value,
  }))

  return {
    sessionId,
    totalReturn: m.total_return,
    cagr: m.cagr,
    sharpe: m.sharpe_ratio,
    mdd: m.mdd,
    winRate: m.win_rate,
    equityCurve,
    benchmarkCurve,
    periods,
  }
}

/** 백엔드 스트레스 결과 → 프론트 StressTestResult 변환 */
function toFrontStressTest(
  results: StressPeriodResult[],
  sessionId: string,
  detailLevel?: DetailLevel,
): StressTestResult {
  const periods: StressPeriodResult[] = results.map((r) => ({
    // 백엔드 필드 유지
    period_key: r.period_key,
    period_name: r.period_name,
    my_return: r.my_return,
    sp500_return: r.sp500_return,
    excess_return: r.excess_return,
    recovery_months: r.recovery_months,
    // 프론트 표시용 필드
    label: r.period_name ?? r.period_key ?? '',
    return: r.my_return ?? 0,
    recoveryMonths: r.recovery_months ?? undefined,
  }))
  return { sessionId, periods, detailLevel }
}

export function useBacktest() {
  const [backtest, setBacktest] = useState<BacktestResult | null>(null)
  const [stress, setStress] = useState<StressTestResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sessionId = useMemo(
    () => localStorage.getItem(SESSION_KEY) || 'local',
    [],
  )

  /** 백테스트 결과 조회 (이미 실행된 결과) */
  const fetchResults = useCallback(
    async (id?: string) => {
      const target = id || sessionId
      setLoading(true)
      setError(null)
      try {
        const periods = await getBacktestResults(target)
        if (!periods || periods.length === 0) {
          setError('저장된 백테스트 결과가 없습니다. 백테스트를 실행해주세요.')
          return null
        }
        const result = toFrontBacktest(periods, target)
        setBacktest(result)
        return result
      } catch {
        setError('결과를 불러오지 못했습니다. 백테스트를 다시 실행해 주세요.')
        return null
      } finally {
        setLoading(false)
      }
    },
    [sessionId],
  )

  /** 백테스트 실행 */
  const run = useCallback(
    async (id?: string) => {
      const target = id || sessionId
      setLoading(true)
      setError(null)
      try {
        const periods = await runBacktest(target)
        const result = toFrontBacktest(periods, target)
        setBacktest(result)
        return result
      } catch {
        setError('백테스트 실행에 실패했습니다.')
        return null
      } finally {
        setLoading(false)
      }
    },
    [sessionId],
  )

  /** 스트레스 테스트 실행 */
  const runStress = useCallback(
    async (id?: string) => {
      const target = id || sessionId
      setLoading(true)
      setError(null)
      try {
        const response = await runStressTest(target)
        const detail = (response as { detail_level?: DetailLevel }).detail_level
        const result = toFrontStressTest(response.results, target, detail)
        setStress(result)
        return result
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
