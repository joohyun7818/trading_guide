import { useMemo } from 'react'
import { useParams } from 'react-router-dom'

export default function SharePage() {
  const params = useParams<{ sessionId: string }>()
  const sessionId = params.sessionId || localStorage.getItem('alphaflow-session') || 'local'

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return ''
    return `${window.location.origin}/results/${sessionId}`
  }, [sessionId])

  const copyLink = async () => {
    if (navigator?.clipboard && shareUrl) {
      await navigator.clipboard.writeText(shareUrl)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-4 rounded-2xl bg-white p-8 shadow-lg shadow-slate-100">
        <p className="text-sm font-semibold text-indigo-700">공유</p>
        <h1 className="text-2xl font-bold text-slate-900">리포트를 공유하세요</h1>
        <p className="text-sm text-slate-600">세션 {sessionId}</p>
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs text-slate-500">링크</p>
          <p className="text-sm font-semibold text-slate-900">{shareUrl}</p>
        </div>
        <button
          onClick={copyLink}
          className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition-all duration-300 hover:-translate-y-0.5 hover:bg-indigo-700"
          type="button"
        >
          링크 복사
        </button>
      </div>
    </div>
  )
}
