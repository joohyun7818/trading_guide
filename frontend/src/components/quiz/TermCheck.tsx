import type { QuizQuestion } from '../../types'

interface TermCheckProps {
  question: QuizQuestion
  index: number
  total: number
  selected?: string
  onSelect: (value: string) => void
  slide?: 'enter' | 'exit'
  direction?: 'next' | 'prev'
  disabled?: boolean
}

export function TermCheck({
  question,
  index,
  total,
  selected,
  onSelect,
  slide = 'enter',
  direction = 'next',
  disabled = false,
}: TermCheckProps) {
  const slideClass = slide === 'exit'
    ? direction === 'next'
      ? '-translate-x-6 opacity-0'
      : 'translate-x-6 opacity-0'
    : 'translate-x-0 opacity-100'

  const buttons = [
    { label: '알아요', value: 'true', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200', active: 'bg-emerald-600 text-white border-emerald-600' },
    { label: '몰라요', value: 'false', tone: 'bg-slate-50 text-slate-700 border-slate-200', active: 'bg-slate-800 text-white border-slate-800' },
  ]

  return (
    <div className={`rounded-2xl bg-white p-6 shadow-lg shadow-slate-100 transition-all duration-300 ease-in-out ${slideClass}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            <span>{question.id}</span>
            <span className="text-slate-400">·</span>
            <span>용어 체크 {index + 1} / {total}</span>
          </div>
          <h3 className="text-xl font-bold text-slate-900">{question.title}</h3>
          {question.description && <p className="text-sm text-slate-500">{question.description}</p>}
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {buttons.map((btn) => {
          const isSelected = selected === btn.value
          return (
            <button
              key={btn.value}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(btn.value)}
              className={`flex items-center justify-between rounded-xl border px-5 py-4 text-base font-semibold transition-all duration-200 ${
                isSelected ? btn.active : btn.tone
              } ${disabled ? 'cursor-not-allowed opacity-60' : 'hover:shadow-md hover:-translate-y-0.5'}`}
            >
              <span>{btn.label}</span>
              <span className="text-xs uppercase tracking-wide">{isSelected ? '선택됨' : '선택'}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
