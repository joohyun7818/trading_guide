import { useMemo } from 'react'

export type DetailLevel = 'beginner' | 'intermediate' | 'advanced'

interface DetailToggleProps {
  value: DetailLevel
  onChange: (value: DetailLevel) => void
}

const levels: { value: DetailLevel; label: string }[] = [
  { value: 'beginner', label: '초급' },
  { value: 'intermediate', label: '중급' },
  { value: 'advanced', label: '고급' },
]

export function DetailToggle({ value, onChange }: DetailToggleProps) {
  const active = useMemo(() => value, [value])

  return (
    <div className="inline-flex rounded-full bg-slate-100 p-1 text-sm">
      {levels.map((level) => {
        const isActive = level.value === active
        return (
          <button
            key={level.value}
            type="button"
            onClick={() => onChange(level.value)}
            className={`px-4 py-2 rounded-full font-semibold transition-all duration-200 ${isActive ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-indigo-700'}`}
          >
            {level.label}
          </button>
        )
      })}
    </div>
  )
}
