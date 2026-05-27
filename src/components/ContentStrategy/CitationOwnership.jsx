import { useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { ownershipSplit } from '../../data/dummy.js'

export default function CitationOwnership() {
  const [mode, setMode] = useState('cited')

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-6">
      <div className="text-slate-900 font-semibold">Citation Ownership Split</div>
      <p className="mt-1 text-sm text-slate-500">Who gets cited when customers search banking queries</p>

      <div className="mt-4 inline-flex w-full bg-slate-50 border border-slate-200 rounded-lg p-1">
        {['cited', 'mentioned'].map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 px-5 py-1.5 rounded-md text-sm font-medium transition-colors ${
              mode === m ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500'
            }`}
          >
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-6">
        <div className="w-44 h-44 shrink-0">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={ownershipSplit}
                innerRadius={48}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {ownershipSplit.map((s, i) => (
                  <Cell key={i} fill={s.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 space-y-4">
          {ownershipSplit.map(s => (
            <div key={s.name}>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-slate-700">
                  <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                  {s.name}
                </span>
                <span className="font-semibold text-slate-900">{s.value}%</span>
              </div>
              <div className="mt-1.5 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${s.value}%`, background: s.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
