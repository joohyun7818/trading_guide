interface AftermathRevealProps {
  aftermath: Record<string, number>
  actionLabel: string
  ticker?: string
  onNext?: () => void
  onFinish?: () => void
  isLast?: boolean
}

export function AftermathReveal({
  aftermath,
  actionLabel,
  ticker = '',
  onNext,
  onFinish,
  isLast = false,
}: AftermathRevealProps) {
  const entries = Object.entries(aftermath)
  const sortedEntries = entries.sort((a, b) => a[0].localeCompare(b[0]))

  return (
    <div className="rounded-2xl bg-white p-6 shadow-lg shadow-slate-100 ring-1 ring-slate-100 transition-all duration-300">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Aftermath</p>
          <h3 className="text-xl font-bold text-slate-900">
            당신의 선택: <span className="text-indigo-700">{actionLabel}</span>
            {ticker && <span className="text-slate-400"> · {ticker}</span>}
          </h3>
          <p className="text-sm text-slate-600">답변 후 1주 ~ 1년 수익률</p>
        </div>
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">실제 결과</span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {sortedEntries.map(([period, ret]) => {
          const positive = ret >= 0
          return (
            <div
              key={period}
              className={`rounded-xl border px-4 py-3 text-center shadow-sm transition-all duration-200 ${
                positive ? 'border-emerald-100 bg-emerald-50 text-emerald-800' : 'border-rose-100 bg-rose-50 text-rose-800'
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{period}</p>
              <p className="mt-1 text-2xl font-bold">
                {positive ? '+' : ''}
                {ret.toFixed(1)}%
              </p>
            </div>
          )
        })}
      </div>

      <div className="mt-6 flex justify-end gap-3">
        {!isLast && onNext && (
          <button
            type="button"
            onClick={onNext}
            className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition-all duration-300 hover:-translate-y-0.5 hover:bg-indigo-700"
          >
            다음 시나리오 →
          </button>
        )}
        {isLast && onFinish && (
          <button
            type="button"
            onClick={onFinish}
            className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition-all duration-300 hover:-translate-y-0.5 hover:bg-emerald-700"
          >
            보정 결과 보기
          </button>
        )}
      </div>
    </div>
  )
}
