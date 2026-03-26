import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { getQuizSession } from '../api/client'
import { DetailToggle } from '../components/common/DetailToggle'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { AICommentary } from '../components/results/AICommentary'
import { AllocationPie } from '../components/results/AllocationPie'
import { EquityChart } from '../components/results/EquityChart'
import { MetricsCards } from '../components/results/MetricsCards'
import { MonthlyHeatmap } from '../components/results/MonthlyHeatmap'
import { PeriodTabs } from '../components/results/PeriodTabs'
import { ReturnCards } from '../components/results/ReturnCards'
import { StrategyAdjuster } from '../components/results/StrategyAdjuster'
import { StrategyCard } from '../components/results/StrategyCard'
import { useAI } from '../hooks/useAI'
import { useBacktest } from '../hooks/useBacktest'
import type {
  Allocation,
  BacktestPeriodResult,
  BacktestResult,
  CommentaryResponse,
  DetailLevel,
  ImageResponse,
  PerformancePoint,
} from '../types'

const SESSION_KEY = 'alphaflow-session'
const DETAIL_KEY = 'alphaflow-detail-level'
const periodOrder = ['1y', '2y', '3y', '5y', '10y']

const fallbackCurve: PerformancePoint[] = [
  { date: '2019-01', value: 10000 },
  { date: '2020-01', value: 11200 },
  { date: '2021-01', value: 13500 },
  { date: '2022-01', value: 12400 },
  { date: '2023-01', value: 15800 },
]

const fallbackAllocation: Allocation = { stocks: 60, bonds: 30, cash: 10 }

function choosePeriod(periods?: BacktestPeriodResult[]) {
  if (!periods || periods.length === 0) return ''
  return periodOrder.find((p) => periods.some((period) => period.period === p)) ?? periods[0].period
}

function toChartData(period?: BacktestPeriodResult) {
  const equity = period?.daily_equity ?? []
  const benchmark = period?.benchmark_equity ?? []
  if (equity.length === 0) {
    return fallbackCurve.map((p) => ({ date: p.date, portfolio: p.value }))
  }
  const benchMap = new Map(benchmark.map((p) => [p.date, p.value]))
  const step = equity.length > 280 ? Math.ceil(equity.length / 280) : 1
  return equity
    .filter((_, idx) => idx % step === 0)
    .map((p) => ({
      date: p.date,
      portfolio: p.value,
      benchmark: benchMap.get(p.date) ?? null,
    }))
}

function toMonthlyHeatmap(period?: BacktestPeriodResult) {
  const equity = period?.daily_equity ?? []
  if (equity.length === 0) return []
  const buckets = new Map<string, { first: number; last: number; year: number; month: number }>()
  for (const point of equity) {
    const dateObj = new Date(point.date)
    if (Number.isNaN(dateObj.valueOf())) continue
    const key = `${dateObj.getFullYear()}-${dateObj.getMonth()}`
    const existing = buckets.get(key)
    if (existing) {
      existing.last = point.value
    } else {
      buckets.set(key, { first: point.value, last: point.value, year: dateObj.getFullYear(), month: dateObj.getMonth() + 1 })
    }
  }
  return Array.from(buckets.values()).map((bucket) => ({
    year: bucket.year,
    month: bucket.month,
    value: bucket.first > 0 ? ((bucket.last / bucket.first) - 1) * 100 : 0,
  }))
}

function normalizeAllocation(allocation?: Allocation | null): Allocation {
  if (!allocation) return fallbackAllocation
  return {
    stocks: allocation.stocks ?? fallbackAllocation.stocks,
    bonds: allocation.bonds ?? fallbackAllocation.bonds,
    cash: allocation.cash ?? Math.max(0, 100 - (allocation.stocks ?? 0) - (allocation.bonds ?? 0)),
  }
}

export default function ResultsPage() {
  const navigate = useNavigate()
  const params = useParams<{ sessionId: string }>()
  const location = useLocation()
  const locationState = (location.state as {
    backtest?: BacktestResult
    commentary?: CommentaryResponse
    image?: ImageResponse
    detailLevel?: DetailLevel
  } | null) ?? null

  const { fetchResults, loading, error } = useBacktest()
  const { fetchCommentary, fetchImage, loading: aiLoading } = useAI()

  const targetSession = params.sessionId || localStorage.getItem(SESSION_KEY) || ''

  const [backtestData, setBacktestData] = useState<BacktestResult | null>(() => locationState?.backtest ?? null)
  const [commentary, setCommentary] = useState<CommentaryResponse | null>(() => locationState?.commentary ?? null)
  const [image, setImage] = useState<ImageResponse | null>(() => locationState?.image ?? null)
  const [detailLevel, setDetailLevel] = useState<DetailLevel>(
    () => locationState?.detailLevel ?? (localStorage.getItem(DETAIL_KEY) as DetailLevel) ?? 'beginner',
  )
  const [activePeriod, setActivePeriod] = useState<string>(() => choosePeriod(locationState?.backtest?.periods))
  const [allocationView, setAllocationView] = useState<Allocation>(() => normalizeAllocation(locationState?.backtest?.allocation))
  const [rebalanceBusy, setRebalanceBusy] = useState(false)

  useEffect(() => {
    if (!targetSession || targetSession === 'local') {
      navigate('/')
    }
  }, [navigate, targetSession])

  useEffect(() => {
    let mounted = true
    if (!backtestData && targetSession && targetSession !== 'local') {
      fetchResults(targetSession).then((data) => {
        if (!mounted) return
        if (data) {
          setBacktestData(data)
          setAllocationView(normalizeAllocation(data.allocation))
          setActivePeriod((prev) => prev || choosePeriod(data.periods))
        }
      })
    }
    return () => {
      mounted = false
    }
  }, [backtestData, fetchResults, targetSession])

  useEffect(() => {
    let mounted = true
    if (!commentary && targetSession && targetSession !== 'local') {
      fetchCommentary(targetSession).then((data) => {
        if (mounted && data) setCommentary(data)
      })
    }

    if (!image && targetSession && targetSession !== 'local') {
      fetchImage(targetSession).then((data) => {
        if (mounted && data) setImage(data)
      })
    }
    return () => {
      mounted = false
    }
  }, [commentary, fetchCommentary, fetchImage, image, targetSession])

  useEffect(() => {
    const loadDetail = async () => {
      if (!targetSession || targetSession === 'local' || locationState?.detailLevel) return
      try {
        const session = await getQuizSession(targetSession)
        if (session?.detail_level) {
          setDetailLevel(session.detail_level)
          localStorage.setItem(DETAIL_KEY, session.detail_level)
        }
      } catch {
        // ignore
      }
    }
    loadDetail()
  }, [locationState?.detailLevel, targetSession])

  const selectedPeriod = useMemo(
    () => backtestData?.periods?.find((p) => p.period === activePeriod) ?? backtestData?.periods?.[0],
    [activePeriod, backtestData?.periods],
  )

  const chartData = useMemo(() => toChartData(selectedPeriod), [selectedPeriod])
  const monthlyHeatmap = useMemo(() => toMonthlyHeatmap(selectedPeriod), [selectedPeriod])

  const returnCards = useMemo(() => {
    const list = backtestData?.periods ?? []
    return periodOrder
      .map((p) => {
        const period = list.find((item) => item.period === p)
        if (!period) return null
        return { label: p.toUpperCase(), value: period.metrics.total_return }
      })
      .filter(Boolean) as { label: string; value: number }[]
  }, [backtestData?.periods])

  const metrics = useMemo(() => {
    const m = selectedPeriod?.metrics
    if (!m) return []
    const items: { label: string; value: string; tone: 'positive' | 'negative' | 'neutral' }[] = [
      { label: '총 수익률', value: `${m.total_return.toFixed(2)}%`, tone: (m.total_return >= 0 ? 'positive' : 'negative') },
      { label: 'CAGR', value: `${m.cagr.toFixed(2)}%`, tone: (m.cagr >= 0 ? 'positive' : 'negative') },
      { label: '샤프', value: m.sharpe_ratio.toFixed(3), tone: (m.sharpe_ratio >= 1 ? 'positive' : 'neutral') },
      { label: 'MDD', value: `${m.mdd.toFixed(2)}%`, tone: 'negative' },
      { label: '승률', value: `${m.win_rate.toFixed(1)}%`, tone: (m.win_rate >= 50 ? 'positive' : 'neutral') },
    ]
    if (detailLevel === 'advanced') {
      items.push(
        { label: 'Sortino', value: m.sortino_ratio.toFixed(3), tone: m.sortino_ratio >= 1 ? 'positive' : 'neutral' as const },
        { label: 'Calmar', value: m.calmar_ratio.toFixed(3), tone: m.calmar_ratio >= 0.5 ? 'positive' : 'neutral' as const },
        { label: 'Best Month', value: `${m.best_month.toFixed(2)}%`, tone: m.best_month >= 0 ? 'positive' : 'neutral' as const },
        { label: 'Worst Month', value: `${m.worst_month.toFixed(2)}%`, tone: 'negative' as const },
      )
    }
    return items
  }, [detailLevel, selectedPeriod?.metrics])

  const benchmarkRows = useMemo(() => {
    if (!backtestData?.periods) return []
    return backtestData.periods.map((p) => ({
      period: p.period.toUpperCase(),
      strategy: p.metrics.total_return,
      benchmark: p.metrics.benchmark_return,
      excess: p.metrics.total_return - (p.metrics.benchmark_return ?? 0),
    }))
  }, [backtestData])

  const heroName = 'AlphaFlow 맞춤 전략'
  const heroDescription = '당신의 위험 성향과 응답을 반영한 미국 ETF 기반 포트폴리오입니다.'

  const handleRebalance = async () => {
    setRebalanceBusy(true)
    // 실제 비중 반영 API는 없으므로 기존 백테스트를 재호출하여 최신 데이터로 새로고침
    const result = await fetchResults(targetSession)
    if (result) {
      setBacktestData(result)
      setAllocationView(normalizeAllocation(result.allocation))
    }
    setRebalanceBusy(false)
  }

  const isLoading = (loading || aiLoading) && !backtestData

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-indigo-50 px-4 py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">결과 리포트</p>
            <h1 className="text-3xl font-black text-slate-900">나만의 전략 리포트</h1>
            <p className="text-sm text-slate-500">
              세션: {targetSession !== 'local' ? `${targetSession.slice(0, 8)}…` : '임시 세션'}
            </p>
          </div>
          <DetailToggle value={detailLevel} onChange={(level) => { setDetailLevel(level); localStorage.setItem(DETAIL_KEY, level) }} />
        </div>

        {isLoading && (
          <div className="rounded-3xl bg-white p-10 text-center shadow-lg shadow-slate-100">
            <LoadingSpinner label="결과를 준비하고 있어요..." />
            <p className="mt-2 text-xs text-slate-500">백테스트와 AI 코멘터리를 동시에 모으는 중입니다.</p>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            ⚠️ {error}
          </div>
        )}

        <StrategyCard
          name={heroName}
          description={heroDescription}
          headline={commentary?.headline}
          funFact={commentary?.fun_fact}
          imageUrl={image?.image_url}
          placeholder={image?.placeholder}
        />

        <div className="space-y-6">
          <ReturnCards items={returnCards} />

          {detailLevel !== 'beginner' && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <PeriodTabs
                periods={periodOrder.filter((p) => backtestData?.periods?.some((period) => period.period === p))}
                active={activePeriod || choosePeriod(backtestData?.periods)}
                onChange={setActivePeriod}
              />
              <div className="rounded-full bg-slate-100 px-4 py-1 text-xs font-semibold text-slate-600">
                {selectedPeriod?.period.toUpperCase() ?? '기간 선택'}
              </div>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-lg shadow-slate-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900">에쿼티 곡선</h3>
                  <span className="text-xs text-slate-500">
                    전략 vs S&P 500
                  </span>
                </div>
                <EquityChart data={chartData} />
              </div>

              <AICommentary
                headline={commentary?.headline}
                summary={commentary?.summary}
                periodAnalysis={commentary?.period_analysis}
                riskWarning={commentary?.risk_warning}
                funFact={detailLevel === 'beginner' ? commentary?.fun_fact : undefined}
              />
            </div>

            <div className="space-y-4">
              <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-lg shadow-slate-100">
                <h3 className="text-lg font-bold text-slate-900">핵심 지표</h3>
                <div className="mt-3">
                  <MetricsCards items={metrics} />
                </div>
              </div>

              {commentary?.risk_warning && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  ⚠️ {commentary.risk_warning}
                </div>
              )}
            </div>
          </div>

          {detailLevel === 'advanced' && (
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
              <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-lg shadow-slate-100">
                <h3 className="text-lg font-bold text-slate-900">자산 배분</h3>
                <AllocationPie allocation={allocationView} />
              </div>

              <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-lg shadow-slate-100">
                <h3 className="text-lg font-bold text-slate-900">월별 수익률 히트맵</h3>
                <MonthlyHeatmap data={monthlyHeatmap} />
              </div>

              <StrategyAdjuster
                allocation={allocationView}
                onChange={(alloc) => setAllocationView(normalizeAllocation(alloc))}
                onRebalance={handleRebalance}
                loading={rebalanceBusy}
              />

              <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-lg shadow-slate-100">
                <h3 className="text-lg font-bold text-slate-900">벤치마크 비교</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                        <th className="py-2 pr-4 text-left font-semibold">기간</th>
                        <th className="py-2 pr-4 text-right font-semibold">전략</th>
                        <th className="py-2 pr-4 text-right font-semibold">S&P 500</th>
                        <th className="py-2 text-right font-semibold">초과</th>
                      </tr>
                    </thead>
                    <tbody>
                      {benchmarkRows.map((row) => (
                        <tr key={row.period} className="border-b border-slate-100">
                          <td className="py-2 pr-4 font-semibold text-slate-800">{row.period}</td>
                          <td className={`py-2 pr-4 text-right font-bold ${row.strategy >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {row.strategy >= 0 ? '+' : ''}{row.strategy.toFixed(2)}%
                          </td>
                          <td className={`py-2 pr-4 text-right font-semibold ${row.benchmark >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {row.benchmark >= 0 ? '+' : ''}{row.benchmark.toFixed(2)}%
                          </td>
                          <td className={`py-2 text-right font-semibold ${row.excess >= 0 ? 'text-indigo-600' : 'text-amber-600'}`}>
                            {row.excess >= 0 ? '+' : ''}{row.excess.toFixed(2)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(`/stress/${targetSession}`, { state: { detailLevel, stress: undefined } })}
            className="rounded-xl border border-indigo-200 bg-white px-5 py-2.5 text-sm font-semibold text-indigo-700 shadow-sm transition-all hover:bg-indigo-50"
          >
            극단 시장 테스트 보기
          </button>
          <button
            type="button"
            onClick={() => navigate(`/share/${targetSession}`, { state: { backtest: backtestData, image, detailLevel } })}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700"
          >
            공유하기
          </button>
        </div>
      </div>
    </div>
  )
}
