import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ActionButtons } from '../components/simulation/ActionButtons'
import { AftermathReveal } from '../components/simulation/AftermathReveal'
import { CalibrationResult } from '../components/simulation/CalibrationResult'
import { NewsHeadlines } from '../components/simulation/NewsHeadlines'
import { PriceChart } from '../components/simulation/PriceChart'
import { PriceInfo } from '../components/simulation/PriceInfo'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { useSimulation } from '../hooks/useSimulation'

type ActionType = 'buy' | 'hold' | 'sell'

export default function SimulationPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = location.state as { sessionId?: string } | null
  const initialQuizSession = locationState?.sessionId

  const {
    scenario,
    scenarios,
    currentIndex,
    totalScenarios,
    isLastScenario,
    aftermathMap,
    start,
    submitAction,
    finalize,
    loading,
    error,
    sessionId,
    quizSessionId,
    completeResult,
  } = useSimulation()

  const [showAftermath, setShowAftermath] = useState(false)
  const [lastAction, setLastAction] = useState<ActionType | null>(null)
  const [answeredScenarioKey, setAnsweredScenarioKey] = useState<string | null>(null)
  const [isFinalizing, setIsFinalizing] = useState(false)

  useEffect(() => {
    const initSession = initialQuizSession || quizSessionId
    if (initSession) {
      start(initSession)
    }
  }, [initialQuizSession, quizSessionId, start])

  const currentRawScenario = scenarios[currentIndex]
  const effectiveScenario = showAftermath && answeredScenarioKey
    ? scenarios.find((s) => s.key === answeredScenarioKey) ?? currentRawScenario
    : currentRawScenario

  const scenarioKey = currentRawScenario?.key ?? scenario.id
  const aftermathKey = answeredScenarioKey ?? scenarioKey
  const currentAftermath = aftermathMap[aftermathKey]

  const chartPoints = useMemo(() => {
    const chart = effectiveScenario?.chart ?? []
    const sliced = chart.slice(-60)
    if (sliced.length === 0) return []
    return sliced.map((point) => ({ date: point.date, close: point.close }))
  }, [effectiveScenario])

  const latestClose = chartPoints.length > 0 ? chartPoints[chartPoints.length - 1].close : 0
  const weekClose = chartPoints.length > 6 ? chartPoints[chartPoints.length - 6].close : latestClose
  const monthClose = chartPoints.length > 23 ? chartPoints[chartPoints.length - 23].close : weekClose || latestClose

  const priceStats = [
    { label: '1달 전', value: monthClose, changeFrom: monthClose },
    { label: '1주 전', value: weekClose, changeFrom: weekClose },
    { label: '현재', value: latestClose, changeFrom: weekClose },
  ]

  const answeredScenario = useMemo(
    () => scenarios.find((s) => s.key === answeredScenarioKey),
    [scenarios, answeredScenarioKey],
  )

  const quizScore = useMemo(() => {
    if (!completeResult) return 0
    if (typeof completeResult.gap === 'number') {
      const reconstructed = completeResult.action_risk_score + completeResult.gap
      return Math.max(0, Math.min(100, Math.round(reconstructed)))
    }
    return completeResult.action_risk_score
  }, [completeResult])

  const showCalibration = Boolean(completeResult)

  const handleAction = async (action: ActionType) => {
    if (loading) return
    setLastAction(action)
    setAnsweredScenarioKey(scenarioKey)
    const result = await submitAction(action)
    if (result) {
      setShowAftermath(true)
    }
  }

  const handleNextScenario = () => {
    setShowAftermath(false)
    setLastAction(null)
    setAnsweredScenarioKey(null)
  }

  const handleFinalize = async () => {
    setIsFinalizing(true)
    await finalize()
    setIsFinalizing(false)
  }

  const goToLoading = () => {
    navigate('/loading', { state: { sessionId: quizSessionId } })
  }

  const sentimentValue = (() => {
    const type = effectiveScenario?.market_type
    if (type === 'down') return 'fear'
    if (type === 'up') return 'greed'
    if (type === 'mixed') return 'neutral'
    return scenario.sentiment
  })()

  const sentimentBadge = {
    fear: 'bg-rose-50 text-rose-700 border-rose-100',
    neutral: 'bg-slate-50 text-slate-700 border-slate-200',
    greed: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  }[sentimentValue] ?? 'bg-slate-50 text-slate-700 border-slate-200'

  const scenarioProgressTotal = totalScenarios || (scenarios.length === 0 ? 1 : scenarios.length)
  const answeredIndex = answeredScenarioKey ? scenarios.findIndex((s) => s.key === answeredScenarioKey) : -1
  const scenarioProgressCurrent = Math.min(
    answeredIndex >= 0 ? answeredIndex + 1 : currentIndex + 1,
    scenarioProgressTotal,
  )
  const answeredIsLast = answeredIndex >= 0 ? answeredIndex >= scenarioProgressTotal - 1 : isLastScenario

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-indigo-50 px-4 py-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="rounded-3xl bg-white/90 p-6 shadow-xl shadow-indigo-50 ring-1 ring-slate-100 backdrop-blur">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
                시뮬레이션 {scenarioProgressTotal > 0 ? `(${scenarioProgressCurrent}/${scenarioProgressTotal})` : ''}
              </p>
              <h1 className="text-3xl font-black text-slate-900">{effectiveScenario?.name ?? scenario.title}</h1>
              <p className="text-sm text-slate-600">{effectiveScenario?.description ?? scenario.narrative}</p>
            </div>
            <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold ${sentimentBadge}`}>
              시장 심리: {sentimentValue === 'fear' ? '공포' : sentimentValue === 'greed' ? '탐욕' : '중립'}
            </div>
          </div>

          <div className="mt-4">
            <div className="h-2 w-full rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full bg-indigo-500 transition-all duration-500"
                style={{ width: `${scenarioProgressTotal ? (scenarioProgressCurrent / scenarioProgressTotal) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {loading && !showAftermath && (
          <div className="rounded-2xl bg-white p-6 shadow-lg shadow-slate-100">
            <LoadingSpinner label="시나리오를 준비 중입니다..." />
          </div>
        )}

        {!showAftermath && (
          <div className="grid gap-4 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <PriceChart data={chartPoints} ticker={effectiveScenario?.ticker} />
              <div className="mt-4">
                <PriceInfo stats={priceStats} />
              </div>
            </div>
            <div className="lg:col-span-2 space-y-4">
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-md shadow-slate-100">
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">시나리오 질문</p>
                <h3 className="mt-1 text-lg font-bold text-slate-900">
                  {currentRawScenario?.question ?? '이 상황에서 매수하시겠습니까?'}
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  대상 티커: <span className="font-semibold text-slate-900">{currentRawScenario?.ticker ?? 'TICKER'}</span>
                </p>
                <div className="mt-4">
                  <ActionButtons onAction={handleAction} disabled={loading} />
                </div>
                {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
              </div>

              <NewsHeadlines
                positive={effectiveScenario?.news_positive}
                negative={effectiveScenario?.news_negative}
              />
            </div>
          </div>
        )}

        {showAftermath && currentAftermath && (
          <AftermathReveal
            aftermath={currentAftermath}
            actionLabel={lastAction === 'buy' ? '매수' : lastAction === 'sell' ? '매도' : '관망'}
            ticker={answeredScenario?.ticker ?? currentRawScenario?.ticker}
            onNext={!answeredIsLast ? handleNextScenario : undefined}
            onFinish={answeredIsLast ? handleFinalize : undefined}
            isLast={answeredIsLast}
          />
        )}

        {isFinalizing && (
          <div className="rounded-2xl bg-white p-6 shadow-lg shadow-slate-100">
            <LoadingSpinner label="보정 결과를 계산하고 있어요..." />
          </div>
        )}

        {showCalibration && completeResult && (
          <CalibrationResult
            quizScore={quizScore}
            actionScore={completeResult.action_risk_score}
            calibratedScore={completeResult.calibrated_risk_score}
            gapType={completeResult.gap_type}
            message={completeResult.message}
            onProceed={goToLoading}
          />
        )}

        <p className="text-center text-xs text-slate-400">시뮬레이션 세션: {sessionId || '없음'}</p>
      </div>
    </div>
  )
}
