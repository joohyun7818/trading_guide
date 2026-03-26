import type { QuizQuestion } from '../../types'
import { Tooltip } from '../common/Tooltip'

interface QuizCardProps {
  question: QuizQuestion
  index: number
  total: number
  selected?: string
  onSelect: (value: string) => void
  slide?: 'enter' | 'exit'
  direction?: 'next' | 'prev'
  disabled?: boolean
}

export function QuizCard({
  question,
  index,
  total,
  selected,
  onSelect,
  slide = 'enter',
  direction = 'next',
  disabled = false,
}: QuizCardProps) {
  const slideClass = slide === 'exit'
    ? direction === 'next'
      ? '-translate-x-6 opacity-0'
      : 'translate-x-6 opacity-0'
    : 'translate-x-0 opacity-100'

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-white p-6 shadow-lg shadow-slate-100 transition-all duration-300 ease-in-out ${slideClass}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            <span>{question.id}</span>
            <span className="text-slate-400">·</span>
            <span>질문 {index + 1} / {total}</span>
          </div>
          <h3 className="text-xl font-bold text-slate-900">{question.title}</h3>
          {question.description && (
            <p className="text-sm text-slate-500">{question.description}</p>
          )}
        </div>
        {question.helper && <Tooltip description={question.helper} />}
      </div>

      <div className="mt-5 space-y-3">
        {question.options.map((option, optIdx) => {
          const isSelected = selected === option.value
          const letter = String.fromCharCode(65 + optIdx)
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelect(option.value)}
              disabled={disabled}
              className={`w-full rounded-xl border-2 px-5 py-4 text-left transition-all duration-200 ${
                isSelected
                  ? 'border-indigo-600 bg-indigo-50 shadow-md shadow-indigo-100'
                  : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-sm'
              } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
            >
              <div className="flex items-start gap-3">
                <span className={`mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                  isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
                >
                  {letter}
                </span>
                <div className="space-y-1">
                  <p className="text-base font-semibold text-slate-900">{option.label}</p>
                  {option.tooltip && <p className="text-xs text-slate-500">{option.tooltip}</p>}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
