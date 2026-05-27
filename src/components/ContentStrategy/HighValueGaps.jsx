import { AlertTriangle } from 'lucide-react'
import { highValueGaps } from '../../data/dummy.js'

function impactClass(i) {
  if (i === 'High') return 'bg-red-50 text-red-700 border-red-100'
  if (i === 'Medium') return 'bg-amber-50 text-amber-700 border-amber-100'
  return 'bg-slate-50 text-slate-600 border-slate-200'
}

export default function HighValueGaps() {
  return (
    <section className="bg-amber-50/40 border border-amber-200 rounded-2xl p-6">
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
          <AlertTriangle className="w-4 h-4" />
        </span>
        <div>
          <div className="text-slate-900 font-semibold">High-Value Gaps — Where IndusInd Bank Is Absent</div>
          <p className="text-sm text-slate-500">High-traffic AI queries where IndusInd is missing — biggest content opportunities first</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {highValueGaps.map(g => (
          <div key={g.topic} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="font-medium text-slate-900 leading-snug">{g.topic}</div>
              <span className={`shrink-0 text-xs px-2 py-0.5 rounded-md border ${impactClass(g.impact)}`}>{g.impact}</span>
            </div>
            <div className="mt-3 text-xs text-slate-500">Missing from</div>
            <div className="mt-1 flex flex-wrap gap-1">
              {g.missingFrom.map(m => (
                <span key={m} className="text-[11px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">{m}</span>
              ))}
            </div>
            <div className="mt-3 text-xs text-slate-500">Opportunity</div>
            <div className="text-sm font-medium text-slate-900">{g.opportunity}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
