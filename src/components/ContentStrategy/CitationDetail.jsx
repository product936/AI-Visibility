import { Sparkles, ShieldCheck, ChevronRight } from 'lucide-react'
import { promptDetails } from '../../data/dummy.js'

export default function CitationDetail() {
  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-slate-900 font-semibold">Citation Detail By Prompt</div>
          <p className="mt-1 text-sm text-slate-500">Which sources AI cites for each IndusInd Bank-related query</p>
        </div>
        <button className="flex items-center gap-1 text-sm font-medium text-blue-700 hover:text-blue-800 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50">
          View All <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {promptDetails.map(p => (
          <div
            key={p.prompt}
            className="flex items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 hover:border-blue-200 hover:bg-blue-50/30 cursor-pointer transition-colors"
          >
            <div className="flex items-start gap-3 min-w-0">
              <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <div className="font-medium text-slate-900 truncate">{p.prompt}</div>
                <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                  <span>{p.citations} citations · {p.sources} sources</span>
                  {p.indusindCited && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700">
                      <ShieldCheck className="w-3 h-3" /> IndusInd Cited
                    </span>
                  )}
                </div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300 shrink-0" />
          </div>
        ))}
      </div>
    </section>
  )
}
