import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface EquityPoint {
  date: string
  portfolio: number
  benchmark?: number | null
}

interface EquityChartProps {
  data: EquityPoint[]
  height?: number
}

export function EquityChart({ data, height = 320 }: EquityChartProps) {
  return (
    <div className="h-full w-full">
      <div className="h-[280px] sm:h-[320px]" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              stroke="#94a3b8"
              tick={{ fontSize: 11 }}
              tickFormatter={(v: string) => v.slice(2, 7)}
            />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
            <ChartTooltip
              formatter={(value: number, name: string) => [
                value.toFixed(2),
                name === 'portfolio' ? '전략' : 'S&P 500',
              ]}
            />
            <Legend formatter={(v) => (v === 'portfolio' ? '전략' : 'S&P 500')} />
            <Line
              type="monotone"
              dataKey="portfolio"
              stroke="#4f46e5"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="benchmark"
              stroke="#94a3b8"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
