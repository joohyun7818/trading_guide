import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { useBacktest } from '../hooks/useBacktest'

const SESSION_KEY = 'alphaflow-session'

export default function StressTestPage() {
  const navigate = useNavigate()
  const params = useParams<{ sessionId: string }>()
  const { stress, runStressTest, loading, error, sessionId } = useBacktest()
  const targetSession = params.sessionId || sessionId

  useEffect(() => {
    if (targetSession && targetSession !== 'local') {
      runStressTest(targetSession)
    }
  }, [runStressTest, targetSession])

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-indigo-700">스트레스 테스트</p>
            <h1 className="text-2xl font-bold text-slate-900">극한 구간 성과 분석</h1>
            <p className="text-sm text-slate-500">
              세션: {targetSession !== 'local' ? targetSession.slice(0, 8) + '...' : '임시'}
            </p>
          </div>
          <button
            onClick={() => navigate(`/results/${targetSession}`)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-all"
            type="button"
          >
            ← 결과로 돌아가기
          </button>
        </div>

        {loading && !stress ? (
          <div className="rounded-2xl bg-white p-10 shadow-lg shadow-slate-100">
            <LoadingSpinner label="스트레스 테스트 계산 중..." />
            <p className="mt-3 text-center text-xs text-slate-400">과거 위기 구간 데이터를 분석하고 있습니다</p>
          </div>
        ) : (
          <div className="rounded-2xl bg-white p-6 shadow-lg shadow-slate-100">
            {error && (
              <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                ⚠️ {error}
              </p>
            )}

            {stress?.periods && stress.periods.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                      <th className="py-3 pr-4 font-semibold">기간</th>
                      <th className="py-3 pr-4 font-semibold">내 전략</th>
                      <th className="py-3 pr-4 font-semibold">S&P 500</th>
                      <th className="py-3 pr-4 font-semibold">초과 수익</th>
                      <th className="py-3 font-semibold">회복 기간</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stress.periods.map((period, idx) => {
                      const myReturn = period.my_return ?? period.return ?? 0
                      const sp500Return = period.sp500_return ?? 0
                      const excess = period.excess_return ?? (myReturn - sp500Return)
                      const recovery = period.recovery_months ?? period.recoveryMonths
                      const label = period.period_name ?? period.label ?? `기간 ${idx + 1}`
                      return (
                        <tr
                          key={period.period_key ?? idx}
                          className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                        >
                          <td className="py-3 pr-4 font-semibold text-slate-900">{label}</td>
                          <td className={`py-3 pr-4 font-bold ${myReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {myReturn > 0 ? '+' : ''}{myReturn.toFixed(2)}%
                          </td>
                          <td className={`py-3 pr-4 font-semibold ${sp500Return >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {sp500Return > 0 ? '+' : ''}{sp500Return.toFixed(2)}%
                          </td>
                          <td className={`py-3 pr-4 font-semibold ${excess >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                            {excess > 0 ? '+' : ''}{excess.toFixed(2)}%
                          </td>
                          <td className="py-3 text-slate-600">
                            {recovery !== undefined && recovery >= 0
                              ? recovery === 0
                                ? '즉시 회복'
                                : `${recovery}개월`
                              : 'N/A'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : !loading ? (
              <div className="py-10 text-center">
                <p className="text-slate-500">스트레스 테스트 결과가 없습니다.</p>
                <button
                  onClick={() => runStressTest(targetSession)}
                  className="mt-4 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-indigo-700 transition-all"
                  type="button"
                >
                  다시 실행하기
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
