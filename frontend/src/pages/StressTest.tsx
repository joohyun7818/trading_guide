import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { DetailToggle } from '../components/common/DetailToggle'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { StoryModal } from '../components/stress/StoryModal'
import { StressPeriodCard } from '../components/stress/StressPeriodCard'
import { useAI } from '../hooks/useAI'
import { useBacktest } from '../hooks/useBacktest'
import type { DetailLevel, StressPeriodResult, StressTestResult } from '../types'

const DETAIL_KEY = 'alphaflow-detail-level'

function classifyBucket(key?: string) {
  const k = (key || '').toLowerCase()
  if (k.includes('crash') || k.includes('bear') || k.includes('gfc') || k.includes('dotcom') || k.includes('covid')) return 'down'
  if (k.includes('rally') || k.includes('bull') || k.includes('boom') || k.includes('recovery')) return 'up'
  return 'mixed'
}

export default function StressTestPage() {
  const navigate = useNavigate()
  const params = useParams<{ sessionId: string }>()
  const location = useLocation()
  const locationState = (location.state as { detailLevel?: DetailLevel; stress?: StressTestResult } | null) ?? null

  const { stress, runStressTest, loading, error, sessionId } = useBacktest()
  const { fetchStory, story, loading: aiLoading } = useAI()

  const targetSession = params.sessionId || sessionId || ''

  const [detailLevel, setDetailLevel] = useState<DetailLevel>(
    () => locationState?.detailLevel ?? (localStorage.getItem(DETAIL_KEY) as DetailLevel) ?? 'beginner',
  )
  const [stressData, setStressData] = useState<StressTestResult | null>(() => locationState?.stress ?? null)
  const [storyOpen, setStoryOpen] = useState(false)
  const [storyLoading, setStoryLoading] = useState(false)

  useEffect(() => {
    if (!targetSession || targetSession === 'local') {
      navigate('/')
    }
  }, [navigate, targetSession])

  useEffect(() => {
    let mounted = true
    if (!stressData && targetSession && targetSession !== 'local') {
      runStressTest(targetSession).then((res) => {
        if (!mounted) return
        if (res) {
          setStressData(res)
          if (res.detailLevel) {
            setDetailLevel(res.detailLevel)
            localStorage.setItem(DETAIL_KEY, res.detailLevel)
          }
        }
      })
    }
    return () => {
      mounted = false
    }
  }, [runStressTest, stressData, targetSession])

  const effectiveStress = stressData ?? stress ?? null

  const grouped = useMemo(() => {
    const buckets: Record<'down' | 'up' | 'mixed', StressPeriodResult[]> = { down: [], up: [], mixed: [] };
    (effectiveStress?.periods ?? []).forEach((period) => {
      const bucket = classifyBucket(period.period_key)
      buckets[bucket].push(period)
    })
    return buckets
  }, [effectiveStress?.periods])

  const handleStory = async (periodKey: string) => {
    setStoryLoading(true)
    await fetchStory(periodKey, targetSession)
    setStoryLoading(false)
    setStoryOpen(true)
  }

  const headline = (() => {
    if (detailLevel === 'beginner') return '극단 시장에서 당신의 전략은?'
    if (detailLevel === 'intermediate') return '시장 위기 구간에서의 성과'
    return 'Stress 테스트: 세부 지표와 스토리'
  })()

  const loadingState = loading || (!effectiveStress && aiLoading)

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-indigo-50 px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">스트레스 테스트</p>
            <h1 className="text-3xl font-black text-slate-900">{headline}</h1>
            <p className="text-sm text-slate-500">
              세션: {targetSession !== 'local' ? `${targetSession.slice(0, 8)}…` : '임시 세션'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <DetailToggle value={detailLevel} onChange={(level) => { setDetailLevel(level); localStorage.setItem(DETAIL_KEY, level) }} />
            <button
              onClick={() => navigate(`/results/${targetSession}`)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50"
              type="button"
            >
              ← 결과로 돌아가기
            </button>
          </div>
        </div>

        {loadingState && (
          <div className="rounded-2xl bg-white p-10 text-center shadow-lg shadow-slate-100">
            <LoadingSpinner label="극단 구간을 계산하고 있어요..." />
            <p className="mt-3 text-xs text-slate-500">과거 위기와 급등 구간을 분석 중입니다.</p>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            ⚠️ {error}
          </div>
        )}

        {!loadingState && effectiveStress?.periods?.length === 0 && (
          <div className="rounded-2xl bg-white p-6 text-center shadow-lg shadow-slate-100">
            <p className="text-slate-600">스트레스 테스트 결과가 없습니다.</p>
            <button
              onClick={() => runStressTest(targetSession)}
              className="mt-4 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-indigo-700"
              type="button"
            >
              다시 실행하기
            </button>
          </div>
        )}

        {!loadingState && effectiveStress?.periods?.length ? (
          <div className="space-y-6">
            {(['down', 'up', 'mixed'] as const).map((bucket) => {
              const list = grouped[bucket]
              if (!list || list.length === 0) return null
              const title = bucket === 'down' ? '하락장' : bucket === 'up' ? '상승장' : '혼합 구간'
              const subtitle =
                bucket === 'down'
                  ? '위기·침체 구간에서의 방어력과 회복 속도'
                  : bucket === 'up'
                    ? '랠리 구간에서의 추종력과 초과 수익'
                    : '복합적 시장 상황에서의 균형 감각'
              return (
                <div key={bucket} className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">{title}</p>
                    <h3 className="text-xl font-bold text-slate-900">{subtitle}</h3>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    {list.map((period) => (
                      <StressPeriodCard
                        key={period.period_key ?? period.label}
                        period={period}
                        detailLevel={detailLevel}
                        onStory={detailLevel !== 'beginner' ? handleStory : undefined}
                      />
                    ))}
                  </div>
                </div>
              )
            })}

            {detailLevel === 'advanced' && (
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-lg shadow-slate-100">
                <h3 className="text-lg font-bold text-slate-900">상세 테이블</h3>
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                        <th className="py-2 pr-4 text-left font-semibold">기간</th>
                        <th className="py-2 pr-4 text-right font-semibold">내 전략</th>
                        <th className="py-2 pr-4 text-right font-semibold">S&P 500</th>
                        <th className="py-2 pr-4 text-right font-semibold">초과 수익</th>
                        <th className="py-2 text-right font-semibold">회복</th>
                      </tr>
                    </thead>
                    <tbody>
                      {effectiveStress?.periods?.map((period, idx) => {
                        const myReturn = period.my_return ?? period.return ?? 0
                        const sp500Return = period.sp500_return ?? 0
                        const excess = period.excess_return ?? (myReturn - sp500Return)
                        const recovery = period.recovery_months ?? period.recoveryMonths
                        const label = period.period_name ?? period.label ?? `기간 ${idx + 1}`
                        return (
                          <tr key={period.period_key ?? idx} className="border-b border-slate-100">
                            <td className="py-2 pr-4 font-semibold text-slate-900">{label}</td>
                            <td className={`py-2 pr-4 text-right font-bold ${myReturn >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {myReturn >= 0 ? '+' : ''}{myReturn.toFixed(2)}%
                            </td>
                            <td className={`py-2 pr-4 text-right font-semibold ${sp500Return >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {sp500Return >= 0 ? '+' : ''}{sp500Return.toFixed(2)}%
                            </td>
                            <td className={`py-2 pr-4 text-right font-semibold ${excess >= 0 ? 'text-indigo-600' : 'text-amber-600'}`}>
                              {excess >= 0 ? '+' : ''}{excess.toFixed(2)}%
                            </td>
                            <td className="py-2 text-right text-slate-700">
                              {recovery !== undefined ? (recovery === 0 ? '즉시' : `${recovery}개월`) : '-'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>

      <StoryModal open={storyOpen} story={story ?? undefined} onClose={() => setStoryOpen(false)} />
      {storyLoading && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/20">
          <LoadingSpinner label="스토리를 불러오는 중..." />
        </div>
      )}
    </div>
  )
}
