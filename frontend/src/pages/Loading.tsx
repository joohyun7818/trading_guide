import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { useAI } from '../hooks/useAI'
import { useBacktest } from '../hooks/useBacktest'
import type { BacktestResult, CommentaryResponse, DetailLevel, ImageResponse, StressTestResult } from '../types'

const SESSION_KEY = 'alphaflow-session'

type StepKey = 'backtest' | 'stress' | 'commentary' | 'image'
type StepStatus = 'pending' | 'running' | 'done' | 'error'

const steps: { key: StepKey; label: string; helper: string }[] = [
  { key: 'backtest', label: '전략을 분석하고 있어요...', helper: '1, 2, 3, 5, 10년 백테스트 실행' },
  { key: 'stress', label: '과거 시장에서 테스트 중...', helper: '극단 구간 스트레스 테스트' },
  { key: 'commentary', label: '결과를 해석하고 있어요...', helper: 'AI 코멘터리 생성' },
  { key: 'image', label: '당신만의 캐릭터를 그리고 있어요...', helper: 'AI 이미지 생성' },
]

export default function LoadingPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const stateSession = (location.state as { sessionId?: string } | null)?.sessionId
  const { runBacktest, runStressTest } = useBacktest()
  const { fetchCommentary, fetchImage } = useAI()

  const targetSession = stateSession || localStorage.getItem(SESSION_KEY) || ''

  const [stepStatus, setStepStatus] = useState<Record<StepKey, StepStatus>>({
    backtest: 'pending',
    stress: 'pending',
    commentary: 'pending',
    image: 'pending',
  })
  const [error, setError] = useState<string | null>(null)

  const resultsRef = useRef<{
    backtest: BacktestResult | null
    stress: StressTestResult | null
    commentary: CommentaryResponse | null
    image: ImageResponse | null
    detailLevel: DetailLevel | null
  }>({ backtest: null, stress: null, commentary: null, image: null, detailLevel: null })

  const progress = useMemo(() => {
    const completed = Object.values(stepStatus).filter((s) => s === 'done').length
    return Math.round((completed / steps.length) * 100)
  }, [stepStatus])

  useEffect(() => {
    if (!targetSession || targetSession === 'local') {
      navigate('/')
      return
    }

    const updateStatus = (key: StepKey, status: StepStatus) => {
      setStepStatus((prev) => ({ ...prev, [key]: status }))
    }

    const runAll = async () => {
      setError(null)
      steps.forEach((step) => updateStatus(step.key, 'running'))

      await Promise.allSettled([
        (async () => {
          try {
            const data = await runBacktest(targetSession)
            resultsRef.current.backtest = data
            updateStatus('backtest', data ? 'done' : 'error')
          } catch {
            updateStatus('backtest', 'error')
            setError('백테스트 실행에 실패했습니다.')
          }
        })(),
        (async () => {
          try {
            const stress = await runStressTest(targetSession)
            resultsRef.current.stress = stress
            resultsRef.current.detailLevel = stress?.detailLevel ?? resultsRef.current.detailLevel
            updateStatus('stress', stress ? 'done' : 'error')
          } catch {
            updateStatus('stress', 'error')
            setError((prev) => prev ?? '스트레스 테스트 실행에 실패했습니다.')
          }
        })(),
        (async () => {
          try {
            const commentary = await fetchCommentary(targetSession)
            resultsRef.current.commentary = commentary
            updateStatus('commentary', commentary ? 'done' : 'error')
          } catch {
            updateStatus('commentary', 'error')
          }
        })(),
        (async () => {
          try {
            const image = await fetchImage(targetSession)
            resultsRef.current.image = image
            updateStatus('image', image ? 'done' : 'error')
          } catch {
            updateStatus('image', 'error')
          }
        })(),
      ])

      setTimeout(() => {
        navigate(`/results/${targetSession}`, {
          state: {
            backtest: resultsRef.current.backtest,
            commentary: resultsRef.current.commentary,
            image: resultsRef.current.image,
            detailLevel: resultsRef.current.detailLevel ?? undefined,
          },
        })
      }, 600)
    }

    runAll()
  }, [fetchCommentary, fetchImage, navigate, runBacktest, runStressTest, targetSession])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 via-white to-indigo-50 px-4 py-10">
      <style>{`
        @keyframes strategy-walk {
          0% { transform: translateX(-4px); }
          50% { transform: translateX(4px); }
          100% { transform: translateX(-4px); }
        }
        .walk-emoji { animation: strategy-walk 1.2s infinite ease-in-out; }
      `}
      </style>
      <div className="w-full max-w-3xl rounded-3xl bg-white/90 p-8 shadow-2xl shadow-indigo-100 ring-1 ring-slate-100 backdrop-blur">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-3xl">
            <span className="walk-emoji">🚶‍♂️</span>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">AlphaFlow</p>
            <h1 className="text-2xl font-black text-slate-900">당신만의 전략을 계산 중...</h1>
            <p className="text-sm text-slate-600">백테스트 · 스트레스 테스트 · AI 코멘터리 · 캐릭터 이미지를 동시에 준비합니다.</p>
          </div>
        </div>

        <div className="mt-6">
          <div className="h-3 w-full rounded-full bg-slate-100">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs font-semibold text-slate-500">진행률 {progress}%</p>
        </div>

        <div className="mt-6 space-y-3">
          {steps.map((step) => {
            const status = stepStatus[step.key]
            const isDone = status === 'done'
            const isRunning = status === 'running'
            return (
              <div
                key={step.key}
                className={`flex items-center justify-between rounded-2xl border px-4 py-3 shadow-sm ${
                  isDone ? 'border-emerald-100 bg-emerald-50' : status === 'error' ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{step.label}</p>
                  <p className="text-xs text-slate-500">{step.helper}</p>
                </div>
                <div className="text-xl">
                  {isDone ? '✅' : status === 'error' ? '⚠️' : isRunning ? <LoadingSpinner label="" /> : '⏳'}
                </div>
              </div>
            )
          })}
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <p className="mt-6 text-center text-xs text-slate-400">세션: {targetSession}</p>
      </div>
    </div>
  )
}
