import { useEffect, useMemo, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import {
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
} from 'recharts'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { useAI } from '../hooks/useAI'
import { useBacktest } from '../hooks/useBacktest'
import type { BacktestResult } from '../types'

const fallbackCurve = [
  { date: '2019', value: 100 },
  { date: '2020', value: 112 },
  { date: '2021', value: 135 },
  { date: '2022', value: 124 },
  { date: '2023', value: 158 },
]

export default function ResultsPage() {
  const { sessionId: hookSession, backtest, fetchResults, loading, error } = useBacktest()
  const { commentary, story, image, fetchCommentary, fetchStory, fetchImage, loading: aiLoading } = useAI()
  const location = useLocation()
  const params = useParams<{ sessionId: string }>()
  const locationBacktest = (location.state as { backtest?: BacktestResult } | null)?.backtest
  const targetSession = params.sessionId || hookSession

  const [localBacktest, setLocalBacktest] = useState<BacktestResult | null>(locationBacktest ?? backtest)

  useEffect(() => {
    if (!localBacktest) {
      fetchResults(targetSession).then((data) => {
        if (data) setLocalBacktest(data)
      })
    }
  }, [fetchResults, localBacktest, targetSession])

  useEffect(() => {
    fetchCommentary(targetSession)
    fetchStory(targetSession)
    fetchImage(targetSession)
  }, [fetchCommentary, fetchStory, fetchImage, targetSession])

  const chartData = useMemo(
    () => localBacktest?.equityCurve ?? fallbackCurve,
    [localBacktest?.equityCurve],
  )

  const metrics = useMemo(() => {
    const data = localBacktest
    if (!data) return null
    return [
      { label: '총 수익률', value: `${data.totalReturn.toFixed(1)}%`, tone: 'positive' },
      { label: 'CAGR', value: `${data.cagr.toFixed(1)}%`, tone: 'positive' },
      { label: '샤프 비율', value: data.sharpe.toFixed(2), tone: 'neutral' },
      { label: 'MDD', value: `${data.mdd.toFixed(1)}%`, tone: 'negative' },
    ]
  }, [localBacktest])

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-indigo-700">결과 리포트</p>
          <h1 className="text-3xl font-extrabold text-slate-900">맞춤 백테스트 리포트</h1>
          <p className="text-sm text-slate-600">세션 {targetSession}</p>
        </div>

        {loading && !localBacktest ? (
          <div className="rounded-2xl bg-white p-10 shadow-lg shadow-slate-100">
            <LoadingSpinner label="결과를 불러오는 중" />
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl bg-white p-6 shadow-lg shadow-slate-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">성과 곡선</h2>
                {error && <span className="text-xs text-red-600">{error}</span>}
              </div>
              <div className="mt-4 h-64 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" domain={['auto', 'auto']} />
                    <ChartTooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                    <Line type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={3} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-2xl bg-white p-6 shadow-lg shadow-slate-100">
                <h3 className="text-lg font-bold text-slate-900">핵심 지표</h3>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {metrics?.map((metric) => (
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
                      <p className="text-xl font-bold">{metric.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-lg shadow-slate-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900">AI 해설</h3>
                  {aiLoading && <span className="text-xs text-slate-500">생성 중...</span>}
                </div>
                {commentary ? (
                  <div className="mt-3 space-y-2 text-sm text-slate-700">
                    {commentary.headline && (
                      <p className="text-base font-semibold text-slate-900">{commentary.headline}</p>
                    )}
                    <p>{commentary.summary}</p>
                    {commentary.bullets && (
                      <ul className="mt-2 list-disc space-y-1 pl-4 text-slate-700">
                        {commentary.bullets.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-600">해설을 준비하고 있습니다.</p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl bg-white p-6 shadow-lg shadow-slate-100">
            <h3 className="text-lg font-bold text-slate-900">스토리텔링</h3>
            {story ? (
              <p className="mt-2 text-sm text-slate-700">{story.summary}</p>
            ) : (
              <p className="mt-2 text-sm text-slate-600">AI가 스토리를 준비 중입니다.</p>
            )}
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-lg shadow-slate-100">
            <h3 className="text-lg font-bold text-slate-900">공유용 이미지</h3>
            {image ? (
              <img
                src={image.url}
                alt={image.alt}
                className="mt-3 h-48 w-full rounded-xl object-cover shadow-sm"
              />
            ) : (
              <div className="mt-3 flex h-48 items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-500">
                이미지 생성 대기 중
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
