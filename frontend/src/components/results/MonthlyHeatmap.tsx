import { Cell, ResponsiveContainer, Treemap, Tooltip } from 'recharts'

interface MonthlyPoint {
  month: number
  year: number
  value: number
}

interface MonthlyHeatmapProps {
  data: MonthlyPoint[]
}

function colorForValue(value: number) {
  if (Number.isNaN(value)) return '#cbd5e1'
  const clamped = Math.max(-20, Math.min(20, value))
  const ratio = (clamped + 20) / 40
  const red = Math.round(255 * (1 - ratio))
  const green = Math.round(255 * ratio)
  return `rgb(${red}, ${green}, 120)`
}

export function MonthlyHeatmap({ data }: MonthlyHeatmapProps) {
  const formatted = data.map((item) => ({
    name: `${item.year}-${String(item.month).padStart(2, '0')}`,
    size: 1,
    value: item.value,
  }))

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <Treemap
          data={formatted}
          dataKey="size"
          nameKey="name"
          isAnimationActive={false}
          stroke="#ffffff"
        >
          {formatted.map((entry) => (
            <Cell key={entry.name} fill={colorForValue(entry.value)} />
          ))}
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null
              const item = payload[0].payload as { name: string; value: number }
              return (
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow">
                  <p className="font-semibold">{item.name}</p>
                  <p>{item.value >= 0 ? '+' : ''}{item.value.toFixed(2)}%</p>
                </div>
              )
            }}
          />
        </Treemap>
      </ResponsiveContainer>
    </div>
  )
}
