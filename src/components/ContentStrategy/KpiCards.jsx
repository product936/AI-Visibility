import { Eye, ShieldCheck, Users, Info } from 'lucide-react'
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

            {k.key === 'third' ? (
              <div className="mt-3 flex flex-col gap-1">
                <span className="text-[11px] uppercase tracking-wider text-slate-400">Best 3rd-Party Cited Source</span>
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-orange-50 border border-orange-100 w-fit">
                  <svg viewBox="0 0 32 32" className="w-4 h-4" aria-hidden="true">
                    <circle cx="16" cy="16" r="16" fill="#FF4500" />
                    <path
                      fill="#fff"
                      d="M25.6 16a2.1 2.1 0 0 0-3.55-1.52c-1.43-.95-3.34-1.56-5.44-1.62l1.04-3.32 2.85.66a1.65 1.65 0 1 0 .19-.94l-3.18-.74-1.18 3.78a10.2 10.2 0 0 0-5.36 1.62A2.1 2.1 0 1 0 8.6 17.7c-.03.2-.04.4-.04.6 0 3.13 3.34 5.67 7.45 5.67s7.45-2.54 7.45-5.67c0-.2-.01-.4-.04-.6A2.1 2.1 0 0 0 25.6 16ZM12.16 17.32a1.32 1.32 0 1 1 2.65 0 1.32 1.32 0 0 1-2.65 0Zm7.86 3.27c-1.04 1.04-3.04 1.12-3.64 1.12s-2.6-.08-3.64-1.12a.4.4 0 0 1 .56-.56c.66.66 2.06.9 3.08.9s2.42-.24 3.08-.9a.4.4 0 1 1 .56.56Zm-.06-1.95a1.32 1.32 0 1 1 0-2.65 1.32 1.32 0 0 1 0 2.65Z"
                    />
                  </svg>
                  <span className="text-sm font-semibold text-orange-700">reddit.com</span>
                  <span className="text-xs font-medium text-orange-600">(25%)</span>
                </span>
              </div>
            ) : k.sub ? (
              <div className="mt-3 text-xs text-slate-500">{k.sub}</div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
