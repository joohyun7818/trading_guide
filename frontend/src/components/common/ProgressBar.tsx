import type { QuizStage } from '../../types'

const steps: { key: QuizStage; label: string }[] = [
  { key: 'quiz', label: '퀴즈' },
  { key: 'terms', label: '용어체크' },
  { key: 'advanced', label: '고급질문' },
  { key: 'simulation', label: '시뮬레이션' },
  { key: 'loading', label: '로딩' },
  { key: 'results', label: '결과' },
]

interface ProgressBarProps {
  current: QuizStage
}

export function ProgressBar({ current }: ProgressBarProps) {
  const activeIndex = Math.max(steps.findIndex((step) => step.key === current), 0)
  const percent = (activeIndex / (steps.length - 1)) * 100

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-indigo-700">현재 단계</p>
        <p className="text-sm text-slate-500">{Math.round(percent)}% 완료</p>
      </div>
      <div className="relative h-2 rounded-full bg-slate-200">
        <div
          className="absolute left-0 top-0 h-2 rounded-full bg-indigo-600 transition-all duration-500"
          style={{ width: `${percent}%` }}
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        />
        <div className="absolute inset-0 flex justify-between">
          {steps.map((step, index) => {
            const isActive = index <= activeIndex
            return (
              <div key={step.key} className="relative flex-1 flex justify-center">
                <span
                  className={`h-3 w-3 rounded-full border-2 transition-colors duration-300 ${isActive ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 bg-white'}`}
                  aria-label={step.label}
                  title={step.label}
                />
              </div>
            )
          })}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-[13px] text-slate-600 sm:grid-cols-6">
        {steps.map((step, index) => (
          <div
            key={step.key}
            className={`rounded-full px-3 py-1 text-center ${index === activeIndex ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'bg-white border border-slate-200'}`}
          >
            {step.label}
          </div>
        ))}
      </div>
    </div>
  )
}
