import type { StoryResponse } from '../../types'

interface StoryModalProps {
  open: boolean
  story?: StoryResponse | null
  onClose: () => void
}

export function StoryModal({ open, story, onClose }: StoryModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
      <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl shadow-slate-900/20">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">AI 스토리</p>
            <h3 className="text-xl font-black text-slate-900">
              {story?.emoji ?? '📈'} {story?.title ?? '이야기를 불러오는 중'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100"
          >
            닫기
          </button>
        </div>

        <div className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
          <p>{story?.story ?? '스토리를 준비하고 있어요.'}</p>
          {story?.lesson && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
              교훈: {story.lesson}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
