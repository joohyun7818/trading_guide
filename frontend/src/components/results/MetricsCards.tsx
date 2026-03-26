type Tone = 'positive' | 'negative' | 'neutral'

interface MetricItem {
  label: string
  value: string
  tone?: Tone
  helper?: string
}

interface MetricsCardsProps {
  items: MetricItem[]
}

export function MetricsCards({ items }: MetricsCardsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((metric) => {
        const tone = metric.tone ?? 'neutral'
        const style =
          tone === 'positive'
            ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
            : tone === 'negative'
              ? 'border-rose-100 bg-rose-50 text-rose-700'
              : 'border-slate-200 bg-slate-50 text-slate-700'
        return (
          <div key={metric.label} className={`rounded-2xl border px-4 py-3 shadow-sm ${style}`}>
            <p className="text-xs font-semibold uppercase tracking-wide">{metric.label}</p>
            <p className="mt-1 text-xl font-bold">{metric.value}</p>
            {metric.helper && <p className="text-[11px] text-slate-500">{metric.helper}</p>}
          </div>
        )
      })}
    </div>
  )
}
