import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ProgressBar } from '../components/common/ProgressBar'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { Tooltip } from '../components/common/Tooltip'
import { useQuiz } from '../hooks/useQuiz'

const stageLabel = {
  quiz: '기본 질문',
  terms: '용어 체크',
  advanced: '고급 질문',
  simulation: '시뮬레이션 준비',
  loading: '로딩',
  results: '결과',
}

export default function QuizPage() {
  const navigate = useNavigate()
  const {
    start,
    stage,
    currentQuestions,
    answers,
    updateAnswer,
    submitBasic,
    submitTermsStep,
    submitAdvancedStep,
    loading,
    error,
    sessionId,
  } = useQuiz()

  useEffect(() => {
    start()
  }, [start])

  const handleNext = async () => {
    if (stage === 'quiz') {
      await submitBasic()
    } else if (stage === 'terms') {
      await submitTermsStep()
    } else if (stage === 'advanced') {
      await submitAdvancedStep()
      navigate('/simulation', { state: { sessionId } })
      return
    }

    if (stage === 'simulation') {
      navigate('/simulation', { state: { sessionId } })
    }
  }

  const nextLabel = stage === 'advanced' ? '시뮬레이션으로' : '다음 단계'

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="rounded-2xl bg-white p-6 shadow-lg shadow-slate-100">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-indigo-700">{stageLabel[stage]}</p>
              <h2 className="text-2xl font-bold text-slate-900">투자 성향 퀴즈</h2>
              <p className="text-sm text-slate-600">단계별 질문에 답하면 맞춤 전략을 추천해드려요.</p>
            </div>
            <div className="text-right text-sm text-slate-500">세션 ID: {sessionId}</div>
          </div>
          <div className="mt-6">
            <ProgressBar current={stage} />
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-10 shadow-lg shadow-slate-100">
            <LoadingSpinner label="질문을 불러오는 중" />
          </div>
        ) : (
          <div className="grid gap-4">
            {currentQuestions.map((question) => (
              <div key={question.id} className="rounded-2xl bg-white p-6 shadow-md shadow-slate-100">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-indigo-700">{question.category.toUpperCase()}</p>
                    <h3 className="mt-1 text-lg font-bold text-slate-900">{question.title}</h3>
                    {question.description && (
                      <p className="mt-1 text-sm text-slate-600">{question.description}</p>
                    )}
                  </div>
                  {question.helper && (
                    <Tooltip description={question.helper} />
                  )}
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {question.options.map((option) => {
                    const selected = answers[question.id] === option.value
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateAnswer(question.id, option.value)}
                        className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-200 ${selected ? 'border-indigo-600 bg-indigo-50 shadow-sm' : 'border-slate-200 bg-white hover:border-indigo-200'}`}
                      >
                        <span
                          className={`mt-1 h-4 w-4 rounded-full border ${selected ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 bg-white'}`}
                        />
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900">{option.label}</p>
                          {option.tooltip && (
                            <p className="text-xs text-slate-600">{option.tooltip}</p>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={handleNext}
                className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition-all duration-300 hover:-translate-y-0.5 hover:bg-indigo-700"
              >
                {nextLabel}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
