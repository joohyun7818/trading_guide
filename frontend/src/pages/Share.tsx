import { useEffect, useMemo, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { useBacktest } from '../hooks/useBacktest'
import type { BacktestResult, DetailLevel, ImageResponse } from '../types'

const SESSION_KEY = 'alphaflow-session'

export default function SharePage() {
  const params = useParams<{ sessionId: string }>()
  const location = useLocation()
  const locationState = (location.state as { backtest?: BacktestResult; image?: ImageResponse; detailLevel?: DetailLevel } | null) ?? null
  const sessionId = params.sessionId || localStorage.getItem(SESSION_KEY) || 'local'

  const { fetchResults, loading } = useBacktest()
  const [backtest, setBacktest] = useState<BacktestResult | null>(() => locationState?.backtest ?? null)
  const [image] = useState<ImageResponse | null>(() => locationState?.image ?? null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!backtest && sessionId && sessionId !== 'local') {
      fetchResults(sessionId).then((res) => {
        if (res) setBacktest(res)
      })
    }
  }, [backtest, fetchResults, sessionId])

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return ''
    return `${window.location.origin}/results/${sessionId}`
  }, [sessionId])

  const copyLink = async () => {
    if (navigator?.clipboard && shareUrl) {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  const heroImg = image?.image_url || image?.placeholder || 'https://placehold.co/600x320?text=AlphaFlow'
  const totalReturn = backtest?.totalReturn ?? backtest?.periods?.[0]?.metrics.total_return
  const cagr = backtest?.cagr ?? backtest?.periods?.[0]?.metrics.cagr

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-indigo-50 px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6 rounded-3xl bg-white/90 p-8 shadow-2xl shadow-indigo-100 ring-1 ring-slate-100 backdrop-blur">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">공유</p>
          <h1 className="text-3xl font-black text-slate-900">친구에게 결과를 보여주세요</h1>
          <p className="text-sm text-slate-500">세션: {sessionId !== 'local' ? `${sessionId.slice(0, 8)}…` : '임시 세션'}</p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
          <img src={heroImg} alt="Strategy" className="h-56 w-full object-cover" />
        </div>

        {loading && !backtest ? (
          <div className="rounded-2xl bg-slate-50 p-6 text-center">
            <LoadingSpinner label="요약을 불러오는 중..." />
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">AlphaFlow 전략</p>
                <h3 className="text-xl font-bold text-slate-900">나만의 ETF 포트폴리오</h3>
                <p className="text-sm text-slate-600">성향 기반 맞춤 배분</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-right">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-emerald-700">
                  <p className="text-xs font-semibold">총 수익률</p>
                  <p className="text-lg font-black">{totalReturn !== undefined ? `${totalReturn.toFixed(2)}%` : 'N/A'}</p>
                </div>
                <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-indigo-700">
                  <p className="text-xs font-semibold">CAGR</p>
                  <p className="text-lg font-black">{cagr !== undefined ? `${cagr.toFixed(2)}%` : 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold text-slate-500">공유 링크</p>
          <p className="truncate text-sm font-semibold text-slate-900">{shareUrl}</p>
        </div>
        <button
          onClick={copyLink}
          className="w-full rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition-all duration-300 hover:-translate-y-0.5 hover:bg-indigo-700"
          type="button"
        >
          {copied ? '복사 완료!' : '링크 복사'}
        </button>
      </div>
    </div>
  )
}
