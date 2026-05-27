import { Eye, ShieldCheck, Users, ArrowUpRight, ArrowDownRight, Info } from 'lucide-react'
import { kpis } from '../../data/dummy.js'

const iconMap = {
  eye: Eye,
  'shield-check': ShieldCheck,
  users: Users,
}

export default function KpiCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {kpis.map((k) => {
        const Icon = iconMap[k.icon] || Eye
        const Arrow = k.deltaDir === 'down' ? ArrowDownRight : ArrowUpRight
        const deltaColor =
          k.deltaTone === 'bad' ? 'text-red-600' : 'text-emerald-600'
        return (
          <div
            key={k.key}
            className="relative bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className={`w-10 h-10 rounded-lg ${k.iconBg} ${k.iconColor} flex items-center justify-center`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="group relative">
                <Info className="w-4 h-4 text-slate-300 hover:text-slate-500 cursor-help" />
                {k.info && (
                  <div className="pointer-events-none absolute right-0 top-6 z-10 w-64 rounded-xl bg-white border border-slate-200 shadow-lg p-3 text-xs text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    {k.info}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 text-[11px] font-medium tracking-wider text-slate-500 uppercase">
              {k.label}
            </div>

            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-semibold text-slate-900 tracking-tight">{k.value}</span>
              {k.suffix && <span className="text-slate-400 text-sm">{k.suffix}</span>}
            </div>

            <div className={`mt-2 flex items-center gap-1 text-xs font-medium ${deltaColor}`}>
              <Arrow className="w-3.5 h-3.5" />
              <span>{k.delta} vs last period</span>
            </div>

            {k.sub && <div className="mt-1 text-xs text-slate-400">{k.sub}</div>}
          </div>
        )
      })}
    </div>
  )
}
