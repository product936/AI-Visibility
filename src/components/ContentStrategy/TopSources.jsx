import { SlidersHorizontal, TrendingUp, ExternalLink } from 'lucide-react'
import { topSources } from '../../data/dummy.js'

function ownershipBadge(o) {
  if (o === 'Owned') return 'bg-blue-50 text-blue-700'
  if (o === 'Competitor') return 'bg-red-50 text-red-700'
  return 'bg-slate-100 text-slate-600'
}

function contentBadge(c) {
  return c === 'Paid' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
}

export default function TopSources() {
  const maxShare = Math.max(...topSources.map(s => s.share))

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-slate-900 font-semibold">Top Citation Sources</div>
          <p className="mt-1 text-sm text-slate-500">Sources most frequently cited by AI for banking queries — ranked by share</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-700 hover:bg-slate-50">
            <SlidersHorizontal className="w-4 h-4" />
            Filters
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-700 hover:bg-slate-50">
            <TrendingUp className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-200">
              <th className="text-left font-medium py-3 pl-2">Source</th>
              <th className="text-left font-medium py-3">Category</th>
              <th className="text-left font-medium py-3">Ownership</th>
              <th className="text-left font-medium py-3">Content</th>
              <th className="font-medium py-3 text-left">Avg Pos.</th>
              <th className="font-medium py-3 text-left">Freq.</th>
              <th className="font-medium py-3 text-left">Share</th>
              <th className="font-medium py-3 text-right pr-2">Cites You</th>
            </tr>
          </thead>
          <tbody>
            {topSources.map(s => (
              <tr key={s.source} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                <td className="py-3.5 pl-2">
                  <a className="flex items-center gap-2 text-slate-900 font-medium hover:text-blue-700">
                    <span className="text-lg leading-none">{s.icon}</span>
                    <span>{s.source}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </a>
                </td>
                <td className="py-3.5 text-slate-600">{s.category}</td>
                <td className="py-3.5">
                  <span className={`px-2 py-0.5 rounded-md text-xs ${ownershipBadge(s.ownership)}`}>{s.ownership}</span>
                </td>
                <td className="py-3.5">
                  <span className={`px-2 py-0.5 rounded-md text-xs ${contentBadge(s.content)}`}>{s.content}</span>
                </td>
                <td className="py-3.5 text-slate-700">{s.pos}</td>
                <td className="py-3.5 text-slate-700">{s.freq}%</td>
                <td className="py-3.5">
                  <div className="flex items-center gap-2 w-32">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(s.share / maxShare) * 100}%` }} />
                    </div>
                    <span className="text-xs text-slate-700 font-medium w-8 text-right">{s.share}%</span>
                  </div>
                </td>
                <td className="py-3.5 pr-2 text-right">
                  <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                    s.cites ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {s.cites ? 'Yes' : 'No'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
