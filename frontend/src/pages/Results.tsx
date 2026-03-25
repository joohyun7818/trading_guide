import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  Line,
  LineChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
} from 'recharts'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { useBacktest } from '../hooks/useBacktest'
import type { BacktestResult, PerformancePoint } from '../types'

const SESSION_KEY = 'alphaflow-session'

const fallbackCurve: PerformancePoint[] = [
  { date: '2019', value: 10000 },
  { date: '2020', value: 11200 },
  { date: '2021', value: 13500 },
  { date: '2022', value: 12400 },
  { date: '2023', value: 15800 },
]

export default function ResultsPage() {
  const navigate = useNavigate()
  const { backtest: hookBacktest, fetchResults, loading, error } = useBacktest()
  const location = useLocation()
  const params = useParams<{ sessionId: string }>()
  const locationBacktest = (location.state as { backtest?: BacktestResult } | null)?.backtest
  const targetSession = params.sessionId || localStorage.getItem(SESSION_KEY) || ''

  const [localBacktest, setLocalBacktest] = useState<BacktestResult | null>(locationBacktest ?? null)

  useEffect(() => {
    if (locationBacktest) {
      setLocalBacktest(locationBacktest)
      return
    }
    if (!localBacktest && targetSession && targetSession !== 'local') {
      fetchResults(targetSession).then((data) => {
        if (data) setLocalBacktest(data)
      })
    }
  }, [fetchResults, localBacktest, locationBacktest, targetSession])

  const chartData = useMemo(() => {
    const curve = localBacktest?.equityCurve
    if (!curve || curve.length === 0) return fallbackCurve
    // 데이터 포인트가 너무 많으면 샘플링 (최대 200개)
    if (curve.length > 200) {
      const step = Math.floor(curve.length / 200)
      return curve.filter((_, i) => i % step === 0)
    }
    return curve
  }, [localBacktest])

  const benchmarkData = useMemo(() => {
    const curve = localBacktest?.benchmarkCurve
    if (!curve || curve.length === 0) return null
    if (curve.length > 200) {
      const step = Math.floor(curve.length / 200)
      return curve.filter((_, i) => i % step === 0)
    }
    return curve
  }, [localBacktest])

  // 차트 데이터: 포트폴리오 + 벤치마크 합치기
  const combinedChartData = useMemo(() => {
    if (!benchmarkData) return chartData.map((p) => ({ date: p.date, portfolio: p.value }))
    const benchMap = new Map(benchmarkData.map((p) => [p.date, p.value]))
    return chartData.map((p) => ({
      date: p.date,
      portfolio: p.value,
      benchmark: benchMap.get(p.date) ?? null,
    }))
  }, [chartData, benchmarkData])

  const metrics = useMemo(() => {
    const data = localBacktest
    if (!data) return null
    return [
      { label: '총 수익률', value: `${data.totalReturn.toFixed(2)}%`, tone: data.totalReturn >= 0 ? 'positive' : 'negative' },
      { label: 'CAGR', value: `${data.cagr.toFixed(2)}%`, tone: data.cagr >= 0 ? 'positive' : 'negative' },
      { label: '샤프 비율', value: data.sharpe.toFixed(3), tone: data.sharpe >= 1 ? 'positive' : 'neutral' },
      { label: 'MDD', value: `${data.mdd.toFixed(2)}%`, tone: 'negative' },
      ...(data.winRate !== undefined ? [{ label: '월간 승률', value: `${data.winRate.toFixed(1)}%`, tone: data.winRate >= 50 ? 'positive' : 'neutral' as string }] : []),
    ]
  }, [localBacktest])

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* 헤더 */}
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-indigo-700">결과 리포트</p>
          <h1 className="text-3xl font-extrabold text-slate-900">맞춤 백테스트 리포트</h1>
          <p className="text-sm text-slate-500">세션: {targetSession !== 'local' ? targetSession.slice(0, 8) + '...' : '임시'}</p>
        </div>

        {loading && !localBacktest ? (
          <div className="rounded-2xl bg-white p-10 shadow-lg shadow-slate-100">
            <LoadingSpinner label="결과를 불러오는 중" />
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            {/* 차트 */}
            <div className="rounded-2xl bg-white p-6 shadow-lg shadow-slate-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">성과 곡선</h2>
                {error && <span className="text-xs text-amber-600">⚠️ {error}</span>}
              </div>
              <div className="mt-4 h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={combinedChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      stroke="#94a3b8"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v: string) => v.slice(0, 7)}
                    />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                    <ChartTooltip
                      formatter={(value: number, name: string) => [
                        `${value.toFixed(2)}`,
                        name === 'portfolio' ? '내 포트폴리오' : 'S&P 500',
                      ]}
                    />
                    <Legend formatter={(v) => (v === 'portfolio' ? '내 포트폴리오' : 'S&P 500')} />
                    <Line
                      type="monotone"
                      dataKey="portfolio"
                      stroke="#4f46e5"
                      strokeWidth={2}
                      dot={false}
                    />
                    {benchmarkData && (
                      <Line
                        type="monotone"
                        dataKey="benchmark"
                        stroke="#94a3b8"
                        strokeWidth={1.5}
                        strokeDasharray="4 2"
                        dot={false}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 지표 */}
            <div className="grid gap-4 content-start">
              <div className="rounded-2xl bg-white p-6 shadow-lg shadow-slate-100">
                <h3 className="text-lg font-bold text-slate-900">핵심 지표</h3>
                {metrics ? (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {metrics.map((metric) => (
                      <div
                        key={metric.label}
                        className={`rounded-xl border px-4 py-3 ${
                          metric.tone === 'positive'
                            ? 'border-green-100 bg-green-50 text-green-700'
                            : metric.tone === 'negative'
                              ? 'border-red-100 bg-red-50 text-red-700'
                              : 'border-slate-200 bg-slate-50 text-slate-700'
                        }`}
                      >
                        <p className="text-xs font-semibold">{metric.label}</p>
                        <p className="text-xl font-bold mt-0.5">{metric.value}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">백테스트 결과가 없습니다.</p>
                )}
              </div>

              {/* 기간별 성과 */}
              {localBacktest?.periods && localBacktest.periods.length > 1 && (
                <div className="rounded-2xl bg-white p-6 shadow-lg shadow-slate-100">
                  <h3 className="text-lg font-bold text-slate-900">기간별 수익률</h3>
                  <div className="mt-3 space-y-2">
                    {localBacktest.periods.map((p) => (
                      <div key={p.period} className="flex items-center justify-between text-sm">
                        <span className="text-slate-600 font-medium">{p.period.toUpperCase()}</span>
                        <span className={`font-bold ${p.metrics.total_return >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {p.metrics.total_return > 0 ? '+' : ''}{p.metrics.total_return.toFixed(2)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 하단 액션 버튼 */}
        <div className="flex flex-wrap gap-3 justify-end pt-2">
          <button
            onClick={() => navigate(`/stress/${targetSession}`)}
            className="rounded-xl border border-indigo-200 bg-white px-5 py-2.5 text-sm font-semibold text-indigo-700 shadow-sm hover:bg-indigo-50 transition-all"
            type="button"
          >
            스트레스 테스트 보기
          </button>
          <button
            onClick={() => navigate(`/share/${targetSession}`)}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all"
            type="button"
          >
            결과 공유하기
          </button>
        </div>
      </div>
    </div>
  )
}
