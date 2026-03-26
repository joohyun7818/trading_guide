interface ReturnCard {
  label: string
  value: number
}

interface ReturnCardsProps {
  items: ReturnCard[]
}

export function ReturnCards({ items }: ReturnCardsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {items.map((item) => {
        const positive = item.value >= 0
        const tone = positive ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-rose-600 bg-rose-50 border-rose-100'
        return (
          <div
            key={item.label}
            className={`rounded-2xl border px-4 py-3 shadow-sm ${tone}`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide">{item.label}</p>
            <p className="mt-1 text-2xl font-black">
              {positive ? '+' : ''}
              {item.value.toFixed(2)}%
            </p>
            <p className="text-[11px] text-slate-500">{positive ? '수익' : '손실'}</p>
          </div>
        )
      })}
    </div>
  )
}
