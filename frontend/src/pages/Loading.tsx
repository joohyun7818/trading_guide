import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { useBacktest } from '../hooks/useBacktest'

export default function LoadingPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const stateSession = (location.state as { sessionId?: string } | null)?.sessionId
  const { runBacktest, sessionId, error } = useBacktest()

  const targetSession = stateSession || sessionId

  useEffect(() => {
    const run = async () => {
      const data = await runBacktest(targetSession)
      if (data) {
        navigate(`/results/${targetSession}`, { state: { backtest: data } })
      }
    }

    run()
  }, [navigate, runBacktest, targetSession])

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-10 text-center shadow-lg shadow-slate-100">
        <LoadingSpinner label="백테스트 실행 중" />
        <p className="mt-3 text-sm text-slate-600">실제 과거 데이터를 기반으로 전략을 계산하고 있어요.</p>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  )
}
