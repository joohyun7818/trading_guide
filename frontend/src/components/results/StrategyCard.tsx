interface StrategyCardProps {
  imageUrl?: string
  placeholder?: string
  name: string
  description?: string
  headline?: string
  funFact?: string
}

export function StrategyCard({
  imageUrl,
  placeholder,
  name,
  description,
  headline,
  funFact,
}: StrategyCardProps) {
  const src = imageUrl || placeholder || 'https://placehold.co/640x400?text=Strategy'

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-lg shadow-slate-100">
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-50 to-sky-50">
          <img
            src={src}
            alt={name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/10 to-transparent" />
        </div>
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            <span>맞춤 전략</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900">{name}</h2>
          {headline && <p className="text-lg font-semibold text-indigo-700">{headline}</p>}
          {description && <p className="text-sm leading-6 text-slate-700">{description}</p>}
          {funFact && (
            <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
              {funFact}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
