import type { DetailLevel, StressPeriodResult } from '../../types'
import { ComparisonBar } from './ComparisonBar'

interface StressPeriodCardProps {
  period: StressPeriodResult
  detailLevel: DetailLevel
  onStory?: (periodKey: string) => void
}

export function StressPeriodCard({ period, detailLevel, onStory }: StressPeriodCardProps) {
  const myReturn = period.my_return ?? period.return ?? 0
  const benchmarkReturn = period.sp500_return ?? 0
  const excess = period.excess_return ?? myReturn - benchmarkReturn
  const recovery = period.recovery_months ?? period.recoveryMonths
  const label = period.period_name ?? period.label ?? period.period_key ?? '기간'

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-md shadow-slate-100">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">{period.period_key}</p>
          <h3 className="text-lg font-bold text-slate-900">{label}</h3>
        </div>
        {onStory && (
          <button
            type="button"
            onClick={() => onStory(period.period_key ?? '')}
            className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
          >
            이야기 보기
          </button>
        )}
      </div>

      <div className="mt-4 space-y-3">
        <ComparisonBar myReturn={myReturn} benchmarkReturn={benchmarkReturn} />

        {detailLevel !== 'beginner' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <p className="text-xs font-semibold text-slate-500">초과 수익률</p>
              <p className={`mt-1 text-lg font-bold ${excess >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {excess >= 0 ? '+' : ''}
                {excess.toFixed(2)}%
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <p className="text-xs font-semibold text-slate-500">회복 기간</p>
              <p className="mt-1 text-lg font-bold text-slate-900">
                {recovery !== undefined ? (recovery === 0 ? '즉시 회복' : `${recovery}개월`) : '데이터 없음'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
