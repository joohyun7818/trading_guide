interface CalibrationResultProps {
  quizScore: number
  actionScore: number
  calibratedScore: number
  gapType?: string
  message?: string
  onProceed?: () => void
}

function Bar({ label, value, tone }: { label: string; value: number; tone: string }) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
        <span>{label}</span>
        <span className={tone}>{clamped}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div
          className={`h-2 rounded-full ${tone.replace('text', 'bg')}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}

export function CalibrationResult({
  quizScore,
  actionScore,
  calibratedScore,
  gapType,
  message,
  onProceed,
}: CalibrationResultProps) {
  const gapTone = gapType?.includes('high') ? 'text-rose-600' : gapType?.includes('low') ? 'text-amber-600' : 'text-emerald-600'

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-lg shadow-slate-100">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">보정 결과</p>
          <h3 className="text-xl font-bold text-slate-900">퀴즈 점수 vs 행동 점수</h3>
          {gapType && <p className={`text-sm font-semibold ${gapTone}`}>{gapType}</p>}
          {message && <p className="text-sm text-slate-600">{message}</p>}
        </div>
        <div className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">Calibrated</div>
      </div>

      <div className="mt-4 space-y-3">
        <Bar label="퀴즈 점수" value={quizScore} tone="text-indigo-600" />
        <Bar label="행동 점수" value={actionScore} tone="text-amber-600" />
        <Bar label="보정 점수" value={calibratedScore} tone="text-emerald-600" />
      </div>

      {onProceed && (
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onProceed}
            className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition-all duration-300 hover:-translate-y-0.5 hover:bg-indigo-700"
          >
            결과 보기
          </button>
        </div>
      )}
    </div>
  )
}
