interface PeriodTabsProps {
  periods: string[]
  active: string
  onChange: (period: string) => void
}

export function PeriodTabs({ periods, active, onChange }: PeriodTabsProps) {
  return (
    <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1 text-sm font-semibold">
      {periods.map((period) => {
        const isActive = period === active
        return (
          <button
            key={period}
            type="button"
            onClick={() => onChange(period)}
            className={`rounded-full px-4 py-2 transition-all ${isActive ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-indigo-700'}`}
          >
            {period.toUpperCase()}
          </button>
        )
      })}
    </div>
  )
}
