import { Sparkles, ShieldCheck, ChevronRight } from 'lucide-react'
import { promptDetails } from '../../data/dummy.js'

export default function CitationDetail() {
  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-slate-900 font-semibold">Prompt-Level Visibility</div>
          <p className="mt-1 text-sm text-slate-500">Which AI engines mention IndusInd Bank for each tracked prompt</p>
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
                <div className="font-medium text-slate-900 line-clamp-2">{p.prompt}</div>
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                  <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">{p.product}</span>
                  <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">{p.category}</span>
                  <span>Mentioned in {p.mentions} / {p.totalLlms} LLMs</span>
                  {p.indusindCited ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700">
                      <ShieldCheck className="w-3 h-3" /> IndusInd Cited
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md bg-red-50 text-red-700">Not cited</span>
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
