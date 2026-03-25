import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { Tooltip } from '../components/common/Tooltip'
import { useSimulation } from '../hooks/useSimulation'

export default function SimulationPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const initialSession = (location.state as { sessionId?: string } | null)?.sessionId
  const { scenario, start, submitAction, finalize, loading, error, sessionId } = useSimulation()

  useEffect(() => {
    start(initialSession)
  }, [initialSession, start])

  const handleAction = async (action: 'buy' | 'hold' | 'sell' | 'rebalance') => {
    await submitAction({ action })
  }

  const handleComplete = async () => {
    await finalize()
    navigate('/loading', { state: { sessionId } })
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-2xl bg-white p-6 shadow-lg shadow-slate-100">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-indigo-700">시뮬레이션</p>
              <h2 className="text-2xl font-bold text-slate-900">{scenario.title}</h2>
              <p className="text-sm text-slate-600">{scenario.date}</p>
            </div>
            <Tooltip description={scenario.keyInsight ?? '과거 시장 상황을 기반으로 한 행동 점수 측정'} />
          </div>
          <div className="mt-4 space-y-3">
            <p className="text-sm text-slate-700">{scenario.narrative}</p>
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700">
              감정 상태: {scenario.sentiment === 'fear' ? '공포' : scenario.sentiment === 'greed' ? '탐욕' : '중립'}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-10 shadow-lg shadow-slate-100">
            <LoadingSpinner label="시나리오 불러오는 중" />
          </div>
        ) : (
          <div className="rounded-2xl bg-white p-6 shadow-lg shadow-slate-100">
            <p className="text-sm font-semibold text-slate-700">당신의 행동을 선택하세요</p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(
                [
                  { action: 'buy', label: '매수', desc: '저점 매수' },
                  { action: 'hold', label: '유지', desc: '계획 유지' },
                  { action: 'sell', label: '매도', desc: '리스크 축소' },
                  { action: 'rebalance', label: '리밸런싱', desc: '비중 조정' },
                ] as const
              ).map((item) => (
                <button
                  key={item.action}
                  onClick={() => handleAction(item.action)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200"
                  type="button"
                >
                  <p className="text-base font-semibold text-slate-900">{item.label}</p>
                  <p className="text-xs text-slate-600">{item.desc}</p>
                </button>
              ))}
            </div>
            {error && (
              <p className="mt-3 text-sm text-red-600">{error}</p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={handleComplete}
                className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition-all duration-300 hover:-translate-y-0.5 hover:bg-indigo-700"
                type="button"
              >
                시뮬레이션 완료
              </button>
            </div>
          </div>
        )}
        <p className="text-center text-xs text-slate-500">세션 ID: {sessionId}</p>
      </div>
    </div>
  )
}
