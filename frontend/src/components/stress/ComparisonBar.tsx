interface ComparisonBarProps {
  myReturn: number
  benchmarkReturn: number
}

export function ComparisonBar({ myReturn, benchmarkReturn }: ComparisonBarProps) {
  const maxAbs = Math.max(Math.abs(myReturn), Math.abs(benchmarkReturn), 1)
  const myWidth = Math.min(100, Math.abs((myReturn / maxAbs) * 100))
  const benchWidth = Math.min(100, Math.abs((benchmarkReturn / maxAbs) * 100))

  const barWidth = (value: number, width: number) => (value === 0 ? 4 : width)

  const bar = (value: number, label: string, color: string) => (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-slate-600">
        <span>{label}</span>
        <span className={`font-semibold ${value >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
          {value >= 0 ? '+' : ''}
          {value.toFixed(2)}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div
          className={`h-2 rounded-full ${color}`}
          style={{ width: `${Math.max(4, barWidth(value, value === myReturn ? myWidth : benchWidth))}%` }}
        />
      </div>
    </div>
  )

  return (
    <div className="space-y-2">
      {bar(myReturn, '내 전략', 'bg-indigo-500')}
      {bar(benchmarkReturn, 'S&P 500', 'bg-slate-400')}
    </div>
  )
}
