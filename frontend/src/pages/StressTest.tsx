import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { useBacktest } from '../hooks/useBacktest'

export default function StressTestPage() {
  const params = useParams<{ sessionId: string }>()
  const { stress, runStressTest, loading, error, sessionId } = useBacktest()
  const targetSession = params.sessionId || sessionId

  useEffect(() => {
    runStressTest(targetSession)
  }, [runStressTest, targetSession])

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-indigo-700">스트레스 테스트</p>
            <h1 className="text-2xl font-bold text-slate-900">극한 구간 성과</h1>
            <p className="text-sm text-slate-600">세션 {targetSession}</p>
          </div>
        </div>

        {loading && !stress ? (
          <div className="rounded-2xl bg-white p-10 shadow-lg shadow-slate-100">
            <LoadingSpinner label="계산 중" />
          </div>
        ) : (
          <div className="rounded-2xl bg-white p-6 shadow-lg shadow-slate-100">
            {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
            <table className="w-full text-left text-sm text-slate-700">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                  <th className="py-2">기간</th>
                  <th className="py-2">수익률</th>
                  <th className="py-2">회복 기간</th>
                  <th className="py-2">코멘트</th>
                </tr>
              </thead>
              <tbody>
                {stress?.periods?.map((period) => (
                  <tr key={period.label} className="border-b border-slate-100">
                    <td className="py-2 font-semibold text-slate-900">{period.label}</td>
                    <td
                      className={`py-2 font-semibold ${period.return >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {period.return.toFixed(1)}%
                    </td>
                    <td className="py-2">
                      {period.recoveryMonths ? `${period.recoveryMonths}개월` : 'N/A'}
                    </td>
                    <td className="py-2 text-slate-600">{period.commentary ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!stress && !loading && (
              <p className="text-sm text-slate-600">아직 스트레스 테스트 결과가 없습니다.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
