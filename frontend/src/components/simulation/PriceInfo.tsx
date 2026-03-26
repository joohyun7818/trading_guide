interface PriceStat {
  label: string
  value: number
  changeFrom?: number
}

interface PriceInfoProps {
  stats: PriceStat[]
}

function formatChange(current: number, base?: number) {
  if (base === undefined || base === 0) return { text: 'N/A', tone: 'text-slate-500', bg: 'bg-slate-100' }
  const diff = ((current - base) / base) * 100
  const tone = diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-rose-600' : 'text-slate-600'
  const bg = diff > 0 ? 'bg-emerald-50' : diff < 0 ? 'bg-rose-50' : 'bg-slate-100'
  const sign = diff > 0 ? '+' : ''
  return { text: `${sign}${diff.toFixed(1)}%`, tone, bg }
}

export function PriceInfo({ stats }: PriceInfoProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {stats.map((stat) => {
        const change = formatChange(stats[stats.length - 1]?.value ?? stat.value, stat.changeFrom)
        return (
          <div key={stat.label} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-md shadow-slate-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">${stat.value.toFixed(2)}</p>
            <span className={`mt-2 inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${change.bg} ${change.tone}`}>
              {change.text}
            </span>
          </div>
        )
      })}
    </div>
  )
}
