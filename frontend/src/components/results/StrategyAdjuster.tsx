import { useEffect, useState } from 'react'
import type { Allocation } from '../../types'

interface StrategyAdjusterProps {
  allocation: Allocation
  onChange: (allocation: Allocation) => void
  onRebalance?: () => void
  loading?: boolean
}

export function StrategyAdjuster({
  allocation,
  onChange,
  onRebalance,
  loading = false,
}: StrategyAdjusterProps) {
  const [localAlloc, setLocalAlloc] = useState<Allocation>(allocation)

  useEffect(() => {
    setLocalAlloc(allocation)
  }, [allocation])

  const handleChange = (key: keyof Allocation, value: number) => {
    const safeValue = Math.max(0, Math.min(100, value))
    const next: Allocation = { ...localAlloc, [key]: safeValue }
    const othersSum =
      key === 'stocks'
        ? (localAlloc.bonds ?? 0) + (localAlloc.cash ?? 0)
        : key === 'bonds'
          ? (localAlloc.stocks ?? 0) + (localAlloc.cash ?? 0)
          : (localAlloc.stocks ?? 0) + (localAlloc.bonds ?? 0)

    // 최대 100% 제약
    if (safeValue + othersSum > 100) {
      next[key] = 100 - othersSum
    }
    next.cash = Math.max(0, 100 - (next.stocks + next.bonds))
    setLocalAlloc(next)
    onChange(next)
  }

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-lg shadow-slate-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">전략 조정</p>
          <h3 className="text-lg font-bold text-slate-900">비중을 조정해보고 재백테스트하세요</h3>
        </div>
        <button
          type="button"
          className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          onClick={onRebalance}
          disabled={loading}
        >
          {loading ? '계산 중...' : '재백테스트'}
        </button>
      </div>

      <div className="mt-4 space-y-4">
        {(['stocks', 'bonds', 'cash'] as const).map((key, idx) => {
          const label = key === 'stocks' ? '주식' : key === 'bonds' ? '채권' : '현금'
          const value = localAlloc[key] ?? 0
          const tone = idx === 0 ? 'accent-indigo-600' : idx === 1 ? 'accent-sky-500' : 'accent-emerald-500'
          return (
            <div key={key}>
              <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                <span>{label}</span>
                <span>{value.toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={value}
                onChange={(e) => handleChange(key, Number(e.target.value))}
                className={`mt-2 h-2 w-full rounded-full bg-slate-200 ${tone}`}
              />
            </div>
          )
        })}
      </div>
      <p className="mt-3 text-xs text-slate-500">합계는 자동으로 100%에 맞춰집니다. 조정 후 재백테스트를 눌러 결과를 새로 확인하세요.</p>
    </div>
  )
}
