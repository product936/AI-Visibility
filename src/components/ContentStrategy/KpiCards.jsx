import { Eye, ShieldCheck, AlertTriangle, Users, ArrowUpRight, ArrowDownRight, Info } from 'lucide-react'
import { kpis } from '../../data/dummy.js'

const iconMap = {
  eye: Eye,
  'shield-check': ShieldCheck,
  'alert-triangle': AlertTriangle,
  users: Users,
}

export default function KpiCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((k) => {
        const Icon = iconMap[k.icon] || Eye
        const Arrow = k.deltaDir === 'down' ? ArrowDownRight : ArrowUpRight
        const deltaColor =
          k.deltaTone === 'bad' ? 'text-red-600' : 'text-emerald-600'
        return (
          <div key={k.key} className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-sm transition-shadow">
            <div className={`w-9 h-9 rounded-lg ${k.iconBg} ${k.iconColor} flex items-center justify-center mb-4`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-1 text-sm text-slate-500">
              {k.label}
              <Info className="w-3.5 h-3.5 text-slate-300" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-semibold text-slate-900 tracking-tight">{k.value}</span>
              {k.suffix && <span className="text-slate-400 text-sm">{k.suffix}</span>}
              {k.extra && <span className="text-slate-400 text-sm">{k.extra}</span>}
            </div>
            <div className={`mt-2 flex items-center gap-1 text-xs font-medium ${deltaColor}`}>
              <Arrow className="w-3.5 h-3.5" />
              <span>{k.delta} vs last period</span>
            </div>
            <div className="mt-1 text-xs text-slate-400">{k.sub}</div>
          </div>
        )
      })}
    </div>
  )
}
