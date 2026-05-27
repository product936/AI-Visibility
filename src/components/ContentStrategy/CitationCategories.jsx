import { sourceCategories } from '../../data/dummy.js'

export default function CitationCategories() {
  const max = Math.max(...sourceCategories.map(c => c.value))

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-6">
      <div className="text-slate-900 font-semibold">Citation Source Categories</div>
      <p className="mt-1 text-sm text-slate-500">By volume across all tracked banking prompts</p>

      <div className="mt-6 space-y-3">
        {sourceCategories.map(c => (
          <div key={c.name} className="flex items-center gap-3">
            <div className="w-32 text-sm text-slate-600 text-right shrink-0">{c.name}</div>
            <div className="flex-1 h-6 bg-slate-100 rounded-md overflow-hidden relative">
              <div
                className="h-full rounded-md flex items-center pl-3 text-white text-xs font-semibold"
                style={{ width: `${(c.value / max) * 100}%`, background: c.color }}
              >
                {c.value}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
