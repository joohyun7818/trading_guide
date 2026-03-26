interface NewsHeadlinesProps {
  positive?: string[]
  negative?: string[]
}

export function NewsHeadlines({ positive = [], negative = [] }: NewsHeadlinesProps) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <div className="rounded-2xl bg-rose-50 p-4 border border-rose-100 shadow-sm shadow-rose-50">
        <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">부정적 뉴스</p>
        <div className="mt-2 space-y-2 text-sm text-rose-800">
          {negative.length === 0 ? (
            <p className="text-rose-600/70">관련 뉴스가 없습니다.</p>
          ) : (
            negative.map((item, idx) => (
              <div key={item + idx} className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-rose-400" />
                <p className="leading-6">{item}</p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-emerald-50 p-4 border border-emerald-100 shadow-sm shadow-emerald-50">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">긍정적 뉴스</p>
        <div className="mt-2 space-y-2 text-sm text-emerald-800">
          {positive.length === 0 ? (
            <p className="text-emerald-600/70">관련 뉴스가 없습니다.</p>
          ) : (
            positive.map((item, idx) => (
              <div key={item + idx} className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400" />
                <p className="leading-6">{item}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
