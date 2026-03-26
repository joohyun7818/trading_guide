interface QuizProgressProps {
  current: number
  total: number
  label?: string
}

export function QuizProgress({ current, total, label = '질문 진행도' }: QuizProgressProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
        <span className="text-indigo-700">{label}</span>
        <span className="text-slate-500">Q{current} / {total}</span>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: total }).map((_, idx) => {
          const step = idx + 1
          const isActive = step === current
          const isDone = step < current
          return (
            <div
              key={step}
              className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                isActive
                  ? 'bg-indigo-500 shadow-sm shadow-indigo-200'
                  : isDone
                    ? 'bg-indigo-200'
                    : 'bg-slate-200'
              }`}
            />
          )
        })}
      </div>
    </div>
  )
}
