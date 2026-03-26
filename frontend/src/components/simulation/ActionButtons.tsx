type ActionType = 'buy' | 'hold' | 'sell'

interface ActionButtonsProps {
  onAction: (action: ActionType) => void
  disabled?: boolean
  busyAction?: ActionType | null
}

const actions: Array<{ action: ActionType; label: string; desc: string; tone: string; hover: string }> = [
  { action: 'buy', label: '매수', desc: '추가 매수 / 신규 진입', tone: 'border-emerald-200 bg-emerald-50 text-emerald-800', hover: 'hover:border-emerald-400 hover:bg-emerald-100' },
  { action: 'hold', label: '관망', desc: '포지션 유지 / 대기', tone: 'border-slate-200 bg-slate-50 text-slate-800', hover: 'hover:border-indigo-300 hover:bg-indigo-50' },
  { action: 'sell', label: '매도', desc: '손실 최소화 / 차익 실현', tone: 'border-rose-200 bg-rose-50 text-rose-800', hover: 'hover:border-rose-400 hover:bg-rose-100' },
]

export function ActionButtons({ onAction, disabled = false, busyAction = null }: ActionButtonsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {actions.map((item) => {
        const isBusy = busyAction === item.action
        return (
          <button
            key={item.action}
            type="button"
            disabled={disabled}
            onClick={() => onAction(item.action)}
            className={`rounded-2xl border px-4 py-4 text-left shadow-sm transition-all duration-200 ${item.tone} ${item.hover} ${
              disabled ? 'cursor-not-allowed opacity-60' : 'hover:-translate-y-0.5 hover:shadow-md'
            }`}
          >
            <p className="text-lg font-bold">{item.label}</p>
            <p className="mt-1 text-sm opacity-80">{item.desc}</p>
            {isBusy && <p className="mt-2 text-xs font-semibold text-indigo-700">제출 중...</p>}
          </button>
        )
      })}
    </div>
  )
}
