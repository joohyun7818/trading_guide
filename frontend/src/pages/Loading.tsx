import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { useBacktest } from '../hooks/useBacktest'

const SESSION_KEY = 'alphaflow-session'

export default function LoadingPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const stateSession = (location.state as { sessionId?: string } | null)?.sessionId
  const { runBacktest, error } = useBacktest()

  // 퀴즈 세션 ID 우선 사용 (백테스트는 quiz_session_id 기준)
  const targetSession = stateSession || localStorage.getItem(SESSION_KEY) || ''

  useEffect(() => {
    if (!targetSession || targetSession === 'local') {
      navigate('/')
      return
    }

    const run = async () => {
      const data = await runBacktest(targetSession)
      // 성공/실패 관계없이 결과 페이지로 이동
      navigate(`/results/${targetSession}`, {
        state: { backtest: data ?? null },
      })
    }

    run()
  }, [navigate, runBacktest, targetSession])

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-10 text-center shadow-lg shadow-slate-100">
        <LoadingSpinner label="백테스트 실행 중..." />
        <p className="mt-4 text-sm text-slate-600">
          실제 과거 데이터를 기반으로 전략을 계산하고 있어요.
        </p>
        <p className="mt-2 text-xs text-slate-400">잠시만 기다려주세요 (최대 1분)</p>
        {error && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
