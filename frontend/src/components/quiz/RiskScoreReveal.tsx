interface RiskScoreRevealProps {
  score: number
  visible?: boolean
  title?: string
  subtitle?: string
}

export function RiskScoreReveal({
  score,
  visible = true,
  title = '위험 점수',
  subtitle = '기본 질문을 기반으로 측정된 현재 점수',
}: RiskScoreRevealProps) {
  const normalized = Math.max(0, Math.min(100, score))
  const circumference = 2 * Math.PI * 48
  const offset = circumference - (normalized / 100) * circumference
  const intensity = normalized >= 70 ? 'text-rose-600' : normalized >= 40 ? 'text-amber-600' : 'text-emerald-600'
  const ringColor = normalized >= 70 ? 'stroke-rose-500' : normalized >= 40 ? 'stroke-amber-500' : 'stroke-emerald-500'

  return (
    <div className={`overflow-hidden rounded-2xl border border-slate-200 bg-white/80 shadow-lg shadow-indigo-50 transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
      <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">{title}</p>
          <h4 className="text-lg font-bold text-slate-900">현재 위험 감내도</h4>
          <p className="text-sm text-slate-600">{subtitle}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative h-28 w-28">
            <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r="48"
                className="stroke-slate-200"
                strokeWidth="10"
                fill="none"
              />
              <circle
                cx="60"
                cy="60"
                r="48"
                className={`${ringColor} drop-shadow`}
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                fill="none"
                style={{ transition: 'stroke-dashoffset 0.8s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <p className="text-xs font-semibold text-slate-500">점수</p>
              <p className={`text-3xl font-black ${intensity}`}>{normalized}</p>
              <p className="text-[11px] text-slate-400">/100</p>
            </div>
          </div>
          <div className="space-y-1 text-sm text-slate-600">
            <p>점수가 높을수록 <span className="font-semibold text-slate-900">공격적</span>인 성향입니다.</p>
            <p>점수가 낮으면 <span className="font-semibold text-slate-900">안정</span>을 선호합니다.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
