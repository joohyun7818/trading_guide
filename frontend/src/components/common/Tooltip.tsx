import type { ReactNode } from 'react'

interface TooltipProps {
  label?: string
  description: string
  children?: ReactNode
}

export function Tooltip({ label, description, children }: TooltipProps) {
  return (
    <span className="relative group inline-flex items-center gap-1 text-sm text-indigo-700">
      {children ?? <span className="h-5 w-5 rounded-full bg-indigo-100 text-indigo-700 inline-flex items-center justify-center text-xs font-semibold">i</span>}
      {label && <span className="font-semibold">{label}</span>}
      <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 hidden w-56 -translate-x-1/2 rounded-xl bg-slate-900 px-3 py-2 text-xs text-white shadow-lg transition-all duration-300 group-hover:block">
        {description}
      </span>
    </span>
  )
}
