import { Link } from 'react-router-dom'
import { DetailToggle } from '../components/common/DetailToggle'
import type { DetailLevel } from '../types'

const steps = [
  { title: '성향 파악', desc: '퀴즈와 용어 체크로 당신의 위험 성향을 정밀 측정' },
  { title: '시뮬레이션', desc: '실제 시장 상황에서의 행동을 가상 체험' },
  { title: '결과 리포트', desc: '백테스트·스트레스 테스트 기반 맞춤 전략 제안' },
]

export default function Landing() {
  const level: DetailLevel = 'intermediate'

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-4 py-2 text-sm font-semibold text-indigo-700">
              AlphaFlow US v2
              <span className="h-2 w-2 rounded-full bg-green-500" aria-hidden />
              실시간 프리뷰
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
                당신의 투자 성향을 알아보세요
              </h1>
              <p className="max-w-2xl text-lg text-slate-600">
                퀴즈 → 시뮬레이션 → 백테스트까지, 10분 안에 나만의 포트폴리오 리포트를 받아보세요.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                to="/quiz"
                className="rounded-xl bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-indigo-200 transition-all duration-300 hover:bg-indigo-700 hover:-translate-y-0.5"
              >
                시작하기
              </Link>
              <span className="text-sm font-semibold text-slate-500">3단계: 성향파악 → 시뮬레이션 → 결과</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {steps.map((step) => (
                <div
                  key={step.title}
                  className="rounded-2xl bg-white p-6 shadow-lg shadow-slate-100 transition-transform duration-300 hover:-translate-y-1"
                >
                  <p className="text-sm font-semibold text-indigo-600">{step.title}</p>
                  <p className="mt-2 text-sm text-slate-600">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl bg-white p-6 shadow-lg shadow-indigo-100">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-indigo-700">리스크 레벨 프리뷰</p>
                <DetailToggle value={level} onChange={() => {}} />
              </div>
              <div className="mt-4 rounded-xl bg-gradient-to-br from-indigo-50 to-white p-5">
                <p className="text-sm text-slate-600">예상 전략</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">균형잡힌 여우 🦊</p>
                <p className="mt-2 text-sm text-slate-600">주식:채권:현금 = 60:30:10</p>
                <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-green-500" aria-hidden />
                  과거 하락장 적응력 우수
                </div>
              </div>
            </div>
            <div className="rounded-2xl bg-indigo-600 p-6 text-white shadow-lg shadow-indigo-200">
              <p className="text-sm font-semibold">AI 요약</p>
              <p className="mt-3 text-lg leading-relaxed">
                개인 리스크 성향과 시나리오 행동 데이터를 조합해 맞춤 전략과 백테스트 리포트를 생성합니다.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-white/10 px-4 py-3">백테스트</div>
                <div className="rounded-xl bg-white/10 px-4 py-3">스트레스 테스트</div>
                <div className="rounded-xl bg-white/10 px-4 py-3">AI 해설</div>
                <div className="rounded-xl bg-white/10 px-4 py-3">공유 카드</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
