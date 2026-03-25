import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ProgressBar } from '../components/common/ProgressBar'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { Tooltip } from '../components/common/Tooltip'
import { useQuiz } from '../hooks/useQuiz'

const stageLabel: Record<string, string> = {
  quiz: '기본 질문 (Q1~Q5)',
  terms: '용어 체크 (T1~T5)',
  advanced: '고급 질문 (Q6~Q10)',
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
    showAdvanced,
    loading,
    error,
    sessionId,
    riskScore,
  } = useQuiz()

  useEffect(() => {
    start()
  }, [start])

  // stage가 simulation으로 바뀌면 자동 이동
  useEffect(() => {
    if (stage === 'simulation') {
      navigate('/simulation', { state: { sessionId } })
    }
  }, [stage, navigate, sessionId])

  const handleNext = async () => {
    if (stage === 'quiz') {
      await submitBasic()
    } else if (stage === 'terms') {
      await submitTermsStep()
      // submitTermsStep 내부에서 stage가 변경됨
    } else if (stage === 'advanced') {
      await submitAdvancedStep()
      // submitAdvancedStep 내부에서 stage가 simulation으로 변경 → useEffect가 이동 처리
    }
  }

  const nextLabel = () => {
    if (stage === 'advanced') return '시뮬레이션으로 →'
    if (stage === 'terms' && !showAdvanced) return '시뮬레이션으로 →'
    return '다음 단계 →'
  }

  // 현재 단계의 모든 질문에 답했는지 확인
  const allAnswered = currentQuestions.length > 0
    ? currentQuestions.every((q) => answers[q.id] !== undefined && answers[q.id] !== '')
    : false

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* 헤더 */}
        <div className="rounded-2xl bg-white p-6 shadow-lg shadow-slate-100">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-indigo-700">{stageLabel[stage] ?? stage}</p>
              <h2 className="text-2xl font-bold text-slate-900">투자 성향 퀴즈</h2>
              <p className="text-sm text-slate-600">단계별 질문에 답하면 맞춤 전략을 추천해드려요.</p>
              {riskScore !== undefined && (
                <p className="mt-1 text-xs text-indigo-600 font-semibold">
                  현재 위험 점수: {riskScore}점
                </p>
              )}
            </div>
            <div className="text-right text-sm text-slate-500">
              세션: {sessionId !== 'local' ? sessionId.slice(0, 8) + '...' : '임시'}
            </div>
          </div>
          <div className="mt-6">
            <ProgressBar current={stage} />
          </div>
        </div>

        {/* 로딩 */}
        {loading ? (
          <div className="rounded-2xl bg-white p-10 shadow-lg shadow-slate-100">
            <LoadingSpinner label="처리 중..." />
          </div>
        ) : (
          <div className="grid gap-4">
            {currentQuestions.length === 0 && stage !== 'terms' ? (
              <div className="rounded-2xl bg-white p-8 text-center shadow-md shadow-slate-100">
                <p className="text-slate-500">질문을 불러오는 중입니다...</p>
              </div>
            ) : (
              currentQuestions.map((question) => (
                <div key={question.id} className="rounded-2xl bg-white p-6 shadow-md shadow-slate-100">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                        {question.id}
                      </p>
                      <h3 className="mt-1 text-lg font-bold text-slate-900">{question.title}</h3>
                      {question.description && (
                        <p className="mt-1 text-sm text-slate-500">{question.description}</p>
                      )}
                    </div>
                    {question.helper && <Tooltip description={question.helper} />}
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {question.options.map((option) => {
                      const selected = answers[question.id] === option.value
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => updateAnswer(question.id, option.value)}
                          className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-200 ${
                            selected
                              ? 'border-indigo-600 bg-indigo-50 shadow-sm'
                              : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50'
                          }`}
                        >
                          <span
                            className={`mt-1 h-4 w-4 flex-shrink-0 rounded-full border-2 transition-colors ${
                              selected ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 bg-white'
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-900">{option.label}</p>
                            {option.tooltip && (
                              <p className="text-xs text-slate-500 mt-0.5">{option.tooltip}</p>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))
            )}

            {/* 에러 메시지 */}
            {error && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                ⚠️ {error}
              </div>
            )}

            {/* 다음 버튼 */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={handleNext}
                disabled={loading || (!allAnswered && currentQuestions.length > 0)}
                className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition-all duration-300 hover:-translate-y-0.5 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {loading ? '처리 중...' : nextLabel()}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
