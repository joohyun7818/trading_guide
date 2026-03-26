import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { Allocation } from '../../types'

interface AllocationPieProps {
  allocation: Allocation
}

const palette = ['#4f46e5', '#0ea5e9', '#22c55e']

export function AllocationPie({ allocation }: AllocationPieProps) {
  const items = [
    { name: 'Stocks', value: allocation.stocks ?? 0 },
    { name: 'Bonds', value: allocation.bonds ?? 0 },
    { name: 'Cash', value: allocation.cash ?? 0 },
  ].filter((item) => item.value !== undefined)

  const total = items.reduce((sum, item) => sum + item.value, 0) || 1
  const normalized = items.map((item) => ({
    ...item,
    value: Math.max(0, item.value),
    percent: ((item.value / total) * 100),
  }))

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={normalized}
            dataKey="value"
            nameKey="name"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
          >
            {normalized.map((entry, idx) => (
              <Cell key={entry.name} fill={palette[idx % palette.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string, payload) => {
              const percent = (payload?.payload?.percent ?? 0).toFixed(1)
              return [`${value.toFixed(1)}% (${percent}%)`, name]
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-slate-700">
        {normalized.map((entry, idx) => (
          <span key={entry.name} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: palette[idx % palette.length] }} />
            {entry.name}: {entry.value.toFixed(1)}%
          </span>
        ))}
      </div>
    </div>
  )
}
