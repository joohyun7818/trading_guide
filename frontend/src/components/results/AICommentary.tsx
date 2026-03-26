interface PeriodAnalysisItem {
  period?: string
  insight?: string
  title?: string
}

interface AICommentaryProps {
  headline?: string
  summary?: string
  periodAnalysis?: PeriodAnalysisItem[]
  riskWarning?: string
  funFact?: string
}

export function AICommentary({
  headline,
  summary,
  periodAnalysis,
  riskWarning,
  funFact,
}: AICommentaryProps) {
  return (
    <div className="space-y-3 rounded-3xl border border-slate-100 bg-white p-6 shadow-lg shadow-slate-100">
      <div className="flex items-center gap-2 text-sm font-semibold text-indigo-700">
        <span>🤖 AI 코멘터리</span>
      </div>
      {headline && <h3 className="text-xl font-black text-slate-900">{headline}</h3>}
      {summary && <p className="text-sm leading-6 text-slate-700">{summary}</p>}

      {periodAnalysis && periodAnalysis.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">기간별 관찰</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {periodAnalysis.map((item, idx) => (
              <div key={`${item.period}-${idx}`} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <p className="text-xs font-semibold text-slate-500">{item.period || item.title || '기간'}</p>
                <p className="mt-1 leading-6">{item.insight || item.title}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {riskWarning && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ⚠️ {riskWarning}
        </div>
      )}

      {funFact && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
          {funFact}
        </div>
      )}
    </div>
  )
}
