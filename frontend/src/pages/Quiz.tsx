import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QuizCard } from '../components/quiz/QuizCard'
import { TermCheck } from '../components/quiz/TermCheck'
import { QuizProgress } from '../components/quiz/QuizProgress'
import { RiskScoreReveal } from '../components/quiz/RiskScoreReveal'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { useQuiz } from '../hooks/useQuiz'

const stageSteps = [
  { key: 'quiz', label: '퀴즈' },
  { key: 'simulation', label: '시뮬레이션' },
  { key: 'results', label: '결과' },
]

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

  const [quizIndex, setQuizIndex] = useState(0)
  const [termIndex, setTermIndex] = useState(0)
  const [advancedIndex, setAdvancedIndex] = useState(0)
  const [slide, setSlide] = useState<'enter' | 'exit'>('enter')
  const [isTransitioning, setIsTransitioning] = useState(false)

  useEffect(() => {
    start()
  }, [start])

  useEffect(() => {
    if (stage === 'simulation') {
      navigate('/simulation', { state: { sessionId } })
    }
  }, [stage, navigate, sessionId])

  useEffect(() => {
    setSlide('enter')
    if (stage === 'quiz') setQuizIndex(0)
    if (stage === 'terms') setTermIndex(0)
    if (stage === 'advanced') setAdvancedIndex(0)
  }, [stage])

  const totalQuestions = showAdvanced ? 10 : 5
  const currentStepLabel = stage === 'simulation' || stage === 'loading' ? 'simulation' : stage === 'results' ? 'results' : 'quiz'

  const activeIndex = stage === 'quiz' ? quizIndex : stage === 'terms' ? termIndex : advancedIndex
  const activeQuestion = currentQuestions[activeIndex]

  const currentQuestionNumber = useMemo(() => {
    if (stage === 'quiz') return Math.min(totalQuestions, quizIndex + 1)
    if (stage === 'advanced') return Math.min(totalQuestions, 5 + advancedIndex + 1)
    return Math.min(totalQuestions, totalQuestions)
  }, [stage, quizIndex, advancedIndex, totalQuestions])

  const handleSelect = (value: string) => {
    if (!activeQuestion || loading || isTransitioning) return
    setIsTransitioning(true)
    updateAnswer(activeQuestion.id, value)
    const stageNow = stage
    const indexNow = activeIndex
    const totalNow = currentQuestions.length
    const isLastInStage = indexNow >= totalNow - 1

    setSlide('exit')
    window.setTimeout(async () => {
      if (stageNow === 'quiz') {
        if (!isLastInStage) {
          setQuizIndex(indexNow + 1)
        } else {
          await submitBasic()
        }
      } else if (stageNow === 'terms') {
        if (!isLastInStage) {
          setTermIndex(indexNow + 1)
        } else {
          await submitTermsStep()
        }
      } else if (stageNow === 'advanced') {
        if (!isLastInStage) {
          setAdvancedIndex(indexNow + 1)
        } else {
          await submitAdvancedStep()
        }
      }
      setSlide('enter')
      setIsTransitioning(false)
    }, 320)
  }

  const answeredCount = useMemo(() => {
    const keys = Object.keys(answers).filter((id) => id.startsWith('Q'))
    return keys.length
  }, [answers])

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-slate-50 to-white px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="rounded-3xl bg-white/80 p-6 shadow-xl shadow-indigo-50 ring-1 ring-slate-100 backdrop-blur">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">투자 성향 퀴즈</p>
              <h1 className="text-3xl font-black text-slate-900">한 번에 한 질문씩, 집중해서 답변해보세요.</h1>
              <p className="text-sm text-slate-600">
                기본 질문 → 용어 체크 → {showAdvanced ? '고급 질문' : '시뮬레이션'} 순서로 진행돼요.
              </p>
            </div>
            <div className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-300">
              세션: {sessionId !== 'local' ? `${sessionId.slice(0, 8)}…` : '임시'}
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            {stageSteps.map((step, idx) => {
              const active = currentStepLabel === step.key || (currentStepLabel === 'simulation' && step.key === 'quiz')
              const done = (idx === 0 && (stage === 'terms' || stage === 'advanced')) || (step.key === 'simulation' && (stage === 'simulation' || stage === 'loading')) || (step.key === 'results' && stage === 'results')
              return (
                <div key={step.key} className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-bold transition-all ${
                    active || done ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-slate-50 text-slate-400'
                  }`}
                  >
                    {idx + 1}
                  </div>
                  <span className={`text-sm font-semibold ${active || done ? 'text-slate-900' : 'text-slate-500'}`}>{step.label}</span>
                  {idx < stageSteps.length - 1 && <div className="h-px w-8 bg-slate-200" />}
                </div>
              )
            })}
          </div>
        </div>

        {riskScore !== undefined && (
          <RiskScoreReveal
            score={riskScore}
            visible
            subtitle="답변을 기반으로 위험 감내도를 계산했어요."
          />
        )}

        <div className="rounded-3xl bg-white/90 p-6 shadow-xl shadow-indigo-50 ring-1 ring-slate-100 backdrop-blur">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <QuizProgress
              current={Math.max(1, currentQuestionNumber)}
              total={totalQuestions}
              label={showAdvanced ? 'Q1 ~ Q10 진행' : 'Q1 ~ Q5 진행'}
            />
            <div className="text-right text-xs text-slate-500">
              답변 {answeredCount} / {totalQuestions}
            </div>
          </div>

          <div className="mt-6">
            {loading && (
              <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <LoadingSpinner label="불러오는 중..." />
              </div>
            )}

            {!activeQuestion && (
              <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-sm text-slate-500">
                다음 단계로 이동 중입니다...
              </div>
            )}

            {activeQuestion && (
              stage === 'terms' ? (
                <TermCheck
                  question={activeQuestion}
                  index={termIndex}
                  total={currentQuestions.length}
                  selected={answers[activeQuestion.id]}
                  onSelect={handleSelect}
                  slide={slide}
                />
              ) : (
                <QuizCard
                  question={activeQuestion}
                  index={stage === 'quiz' ? quizIndex : 5 + advancedIndex}
                  total={stage === 'quiz' ? currentQuestions.length : currentQuestions.length + (stage === 'advanced' ? 5 : 0)}
                  selected={answers[activeQuestion.id]}
                  onSelect={handleSelect}
                  slide={slide}
                />
              )
            )}

            {error && (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                ⚠️ {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
