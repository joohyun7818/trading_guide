import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface PriceChartProps {
  data: Array<{ date: string; close: number }>
  ticker?: string
}

function formatDateLabel(date: string) {
  return date.slice(5)
}

export function PriceChart({ data, ticker = '' }: PriceChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
        가격 데이터를 불러오지 못했습니다.
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-md shadow-slate-100">
      <div className="flex items-center justify-between pb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">가격 차트</p>
          <p className="text-sm font-semibold text-slate-900">{ticker} · 최근 흐름</p>
        </div>
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">일봉</span>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDateLabel}
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              minTickGap={20}
            />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={70}
              tickFormatter={(v) => `$${v.toFixed(0)}`}
            />
            <RechartsTooltip
              cursor={{ stroke: '#c7d2fe' }}
              contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }}
              formatter={(value: number) => [`$${value.toFixed(2)}`, '종가']}
              labelFormatter={(label) => `날짜: ${label}`}
            />
            <Area
              type="monotone"
              dataKey="close"
              stroke="#4f46e5"
              strokeWidth={2.5}
              fill="url(#priceGradient)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
