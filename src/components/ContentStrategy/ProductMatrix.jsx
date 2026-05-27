import { useMemo, useState } from 'react'
import { Eye, CheckCircle2, XCircle } from 'lucide-react'
import { productCategories, llms, productMatrix } from '../../data/dummy.js'

function scoreClass(score) {
  if (score >= 80) return 'bg-emerald-50 text-emerald-700'
  if (score >= 60) return 'bg-amber-50 text-amber-700'
  if (score >= 40) return 'bg-orange-50 text-orange-700'
  return 'bg-red-50 text-red-700'
}

export default function ProductMatrix() {
  const [filter, setFilter] = useState('All')

  const rows = useMemo(
    () => (filter === 'All' ? productMatrix : productMatrix.filter(r => r.category === filter)),
    [filter]
  )

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-slate-900 font-semibold">
            <Eye className="w-4 h-4 text-blue-600" />
            AI Visibility By Product &amp; LLM
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Are IndusInd Bank products appearing in AI answers? <span className="text-emerald-600">Green</span> = visible, <span className="text-red-600">Red</span> = absent.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {productCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-200">
              <th className="text-left font-medium py-3 pl-2">Product</th>
              <th className="text-left font-medium py-3">Category</th>
              {llms.map(l => (
                <th key={l.key} className="font-medium py-3 text-center">
                  <span className="inline-flex items-center gap-1">
                    <span>{l.emoji}</span>
                    <span>{l.label}</span>
                  </span>
                </th>
              ))}
              <th className="font-medium py-3 text-right pr-2">Score</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.product} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                <td className="py-3.5 pl-2 font-medium text-slate-900">{r.product}</td>
                <td className="py-3.5">
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs">{r.category}</span>
                </td>
                {llms.map(l => (
                  <td key={l.key} className="py-3.5 text-center">
                    {r[l.key] ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 inline" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400 inline" />
                    )}
                  </td>
                ))}
                <td className="py-3.5 pr-2 text-right">
                  <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-semibold ${scoreClass(r.score)}`}>
                    {r.score}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center gap-6 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Visible in AI response
        </span>
        <span className="flex items-center gap-1.5">
          <XCircle className="w-4 h-4 text-red-400" /> Absent from AI response
        </span>
      </div>
    </section>
  )
}
