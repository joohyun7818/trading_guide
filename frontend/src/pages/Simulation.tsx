import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { Tooltip } from '../components/common/Tooltip'
import { useSimulation } from '../hooks/useSimulation'

export default function SimulationPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const initialQuizSession = (location.state as { sessionId?: string } | null)?.sessionId

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
  } = useSimulation()

  // 직전 시나리오에 대한 aftermath 표시 여부
  const [showAftermath, setShowAftermath] = useState(false)
  const [lastAction, setLastAction] = useState<string | null>(null)

  useEffect(() => {
    const initSession = initialQuizSession || quizSessionId
    if (initSession && initSession !== 'local') {
      start(initSession)
    }
  }, [initialQuizSession, quizSessionId, start])

  const handleAction = async (action: 'buy' | 'hold' | 'sell') => {
    setLastAction(action)
    const result = await submitAction(action)
    if (result) {
      setShowAftermath(true)
    }
  }

  const handleNextScenario = () => {
    setShowAftermath(false)
    setLastAction(null)
  }

  const handleComplete = async () => {
    setShowAftermath(false)
    const result = await finalize()
    if (result) {
      // 백테스트 실행을 위해 loading 페이지로 이동
      navigate('/loading', { state: { sessionId: quizSessionId } })
    } else {
      navigate('/loading', { state: { sessionId: quizSessionId } })
    }
  }

  const sentimentLabel = {
    fear: '😨 공포',
    neutral: '😐 중립',
    greed: '🤑 탐욕',
  }

  // 현재 시나리오의 aftermath 데이터
  const currentAftermath = aftermathMap[scenario.id]

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* 헤더 */}
        <div className="rounded-2xl bg-white p-6 shadow-lg shadow-slate-100">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-indigo-700">
                시뮬레이션 {totalScenarios > 0 ? `(${currentIndex + 1}/${totalScenarios})` : ''}
              </p>
              <h2 className="text-2xl font-bold text-slate-900">{scenario.title}</h2>
              <p className="text-sm text-slate-500">{scenario.date}</p>
            </div>
            <Tooltip description={scenario.keyInsight ?? '과거 시장 상황을 기반으로 한 행동 점수 측정'} />
          </div>
          <div className="mt-4 space-y-3">
            <p className="text-sm text-slate-700 leading-relaxed">{scenario.narrative}</p>
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700">
              시장 심리: {sentimentLabel[scenario.sentiment] ?? scenario.sentiment}
            </div>
          </div>

          {/* 진행 바 */}
          {totalScenarios > 1 && (
            <div className="mt-4">
              <div className="h-1.5 w-full rounded-full bg-slate-100">
                <div
                  className="h-1.5 rounded-full bg-indigo-500 transition-all duration-500"
                  style={{ width: `${((currentIndex + 1) / totalScenarios) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* 로딩 */}
        {loading ? (
          <div className="rounded-2xl bg-white p-10 shadow-lg shadow-slate-100">
            <LoadingSpinner label="처리 중..." />
          </div>
        ) : showAftermath && currentAftermath ? (
          /* Aftermath 결과 카드 */
          <div className="rounded-2xl bg-white p-6 shadow-lg shadow-slate-100">
            <h3 className="text-lg font-bold text-slate-900">
              선택: <span className={`${lastAction === 'buy' ? 'text-green-600' : lastAction === 'sell' ? 'text-red-600' : 'text-indigo-600'}`}>
                {lastAction === 'buy' ? '매수' : lastAction === 'sell' ? '매도' : '유지'}
              </span>
            </h3>
            <p className="mt-2 text-sm text-slate-600">이후 시장 결과</p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {Object.entries(currentAftermath).map(([period, ret]) => (
                <div
                  key={period}
                  className={`rounded-xl border px-3 py-2 text-center ${
                    ret >= 0 ? 'border-green-100 bg-green-50' : 'border-red-100 bg-red-50'
                  }`}
                >
                  <p className="text-xs text-slate-500">{period}</p>
                  <p className={`text-lg font-bold ${ret >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {ret > 0 ? '+' : ''}{ret.toFixed(1)}%
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              {!isLastScenario ? (
                <button
                  onClick={handleNextScenario}
                  className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition-all duration-300 hover:-translate-y-0.5 hover:bg-indigo-700"
                  type="button"
                >
                  다음 시나리오 →
                </button>
              ) : (
                <button
                  onClick={handleComplete}
                  className="rounded-xl bg-green-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-green-200 transition-all duration-300 hover:-translate-y-0.5 hover:bg-green-700"
                  type="button"
                >
                  결과 확인하기 🎯
                </button>
              )}
            </div>
          </div>
        ) : (
          /* 행동 선택 카드 */
          <div className="rounded-2xl bg-white p-6 shadow-lg shadow-slate-100">
            <p className="text-sm font-semibold text-slate-700">이 상황에서 어떤 행동을 하시겠습니까?</p>
            {scenarios.length > 0 && scenarios[currentIndex] && (
              <p className="mt-1 text-xs text-slate-500">
                대상: {scenarios[currentIndex].ticker} — {scenarios[currentIndex].question}
              </p>
            )}
            <div className="mt-4 grid grid-cols-3 gap-3">
              {(
                [
                  { action: 'buy', label: '매수', desc: '저점 매수 / 추가 매수', color: 'hover:border-green-300 hover:bg-green-50' },
                  { action: 'hold', label: '유지', desc: '현재 포지션 유지', color: 'hover:border-indigo-300 hover:bg-indigo-50' },
                  { action: 'sell', label: '매도', desc: '손실 최소화 / 익절', color: 'hover:border-red-300 hover:bg-red-50' },
                ] as const
              ).map((item) => (
                <button
                  key={item.action}
                  onClick={() => handleAction(item.action)}
                  className={`rounded-xl border border-slate-200 bg-white px-4 py-4 text-center shadow-sm transition-all duration-200 hover:-translate-y-0.5 ${item.color}`}
                  type="button"
                >
                  <p className="text-base font-bold text-slate-900">{item.label}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.desc}</p>
                </button>
              ))}
            </div>

            {error && (
              <p className="mt-3 text-sm text-red-600">{error}</p>
            )}

            {/* 완료 버튼: 마지막 시나리오이고 아직 답변 안 한 경우 */}
            {isLastScenario && (
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleComplete}
                  className="rounded-xl bg-slate-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-200 transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-700"
                  type="button"
                >
                  시뮬레이션 완료
                </button>
              </div>
            )}
          </div>
        )}

        <p className="text-center text-xs text-slate-400">시뮬레이션 세션: {sessionId || '없음'}</p>
      </div>
    </div>
  )
}
