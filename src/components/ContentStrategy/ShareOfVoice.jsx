import { useState } from 'react'
import { Info } from 'lucide-react'
import { competitors } from '../../data/dummy.js'

export default function ShareOfVoice() {
  const [mode, setMode] = useState('cited')
  const max = Math.max(...competitors.map(c => c.cited))

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-6">
      <div className="flex items-center gap-2 text-slate-900 font-semibold">
        Competitive Share Of Voice
        <Info className="w-4 h-4 text-slate-300" />
      </div>
      <p className="mt-1 text-sm text-slate-500">How IndusInd Bank&apos;s AI presence compares to competitors</p>

      <div className="mt-4 inline-flex items-center bg-slate-50 border border-slate-200 rounded-lg p-1">
        {['cited', 'mentioned'].map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-5 py-1.5 rounded-md text-sm font-medium transition-colors ${
              mode === m ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500'
            }`}
          >
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {competitors.map(c => {
          const isYou = c.isYou
          return (
            <div
              key={c.name}
              className={`rounded-xl border p-4 ${
                isYou ? 'bg-blue-50/60 border-blue-200' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">{c.icon}</span>
                  <span className="text-sm font-medium text-slate-700 truncate">{c.name}</span>
                </div>
                {isYou && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-600 text-white font-medium">You</span>
                )}
              </div>
              <div className="mt-3 text-2xl font-semibold text-slate-900 tracking-tight">{c.cited}%</div>
              <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${isYou ? 'bg-blue-600' : 'bg-slate-400'}`}
                  style={{ width: `${(c.cited / max) * 100}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
