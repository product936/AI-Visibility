import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  Lightbulb,
  Target,
  ScanSearch,
  Star,
  FileText,
  MessageSquare,
  Users,
  ClipboardCheck,
  Menu,
  ChevronDown,
  User,
} from 'lucide-react'
import { cn } from '../lib/utils.js'

const navItems = [
  { to: '/insights', icon: Lightbulb, label: 'Insights AI', hasChildren: true },
  { to: '/presence', icon: Target, label: 'Presence AI', hasChildren: true },
  { to: '/competitor', icon: ScanSearch, label: 'Competitor AI', hasChildren: true },
  { to: '/reviews', icon: Star, label: 'Reviews AI', hasChildren: true },
  {
    to: '/pages',
    icon: FileText,
    label: 'Pages AI',
    children: [
      { to: '/pages/dashboard', label: 'Dashboard' },
      { to: '/content-strategy', label: 'Content Strategy and AI' },
      { to: '/pages/deep-dive', label: 'Deep Dive' },
    ],
  },
  { to: '/interaction', icon: MessageSquare, label: 'Interaction AI', hasChildren: true },
  { to: '/audience', icon: Users, label: 'Audience AI', hasChildren: true },
  { to: '/tasks', icon: ClipboardCheck, label: 'Tasks AI', hasChildren: true },
]

function SingleInterfaceLogo() {
  const dots = [
    ['#2563eb', '#2563eb', '#7c3aed'],
    ['#7c3aed', '#7c3aed', '#06b6d4'],
    ['#06b6d4', '#10b981', '#10b981'],
  ]
  return (
    <div className="grid grid-cols-3 gap-[3px] w-6 h-6 shrink-0">
      {dots.flat().map((c, i) => (
        <span key={i} className="rounded-[2px]" style={{ background: c }} />
      ))}
    </div>
  )
}

export default function Sidebar() {
  const [expanded, setExpanded] = useState(true)
  const location = useLocation()
  const pagesActive = location.pathname.startsWith('/pages') || location.pathname === '/content-strategy'
  const [pagesOpen, setPagesOpen] = useState(pagesActive)

  return (
    <aside
      className={cn(
        'bg-white border-r border-slate-200 flex flex-col shrink-0 transition-[width] duration-200',
        expanded ? 'w-[260px]' : 'w-[72px]'
      )}
    >
      <div className={cn('flex items-center gap-2 h-16 border-b border-slate-100', expanded ? 'px-4' : 'justify-center')}>
        {expanded && (
          <div className="flex items-center gap-2 min-w-0">
            <SingleInterfaceLogo />
            <span className="font-semibold text-slate-900 truncate">SingleInterface</span>
          </div>
        )}
        <button
          onClick={() => setExpanded(v => !v)}
          className={cn(
            'w-9 h-9 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100',
            expanded && 'ml-auto'
          )}
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      <nav className={cn('flex-1 overflow-y-auto py-3', expanded ? 'px-3' : 'px-2 flex flex-col items-center gap-1')}>
        {navItems.map(item => {
          const Icon = item.icon
          const isPages = item.label === 'Pages AI'

          if (!expanded) {
            return (
              <NavLink
                key={item.to}
                to={isPages ? '/content-strategy' : item.to}
                title={item.label}
                className={({ isActive }) => {
                  const active = isPages ? pagesActive : isActive
                  return cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center transition-colors',
                    active ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                  )
                }}
              >
                <Icon className="w-5 h-5" />
              </NavLink>
            )
          }

          if (isPages) {
            return (
              <div key={item.to} className="mt-0.5">
                <button
                  onClick={() => setPagesOpen(v => !v)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    pagesActive ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-100'
                  )}
                >
                  <Icon className={cn('w-5 h-5', pagesActive ? 'text-blue-600' : 'text-slate-500')} />
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronDown className={cn('w-4 h-4 transition-transform', pagesOpen && 'rotate-180')} />
                </button>
                {pagesOpen && (
                  <div className="mt-1 ml-3 pl-3 border-l border-slate-200 space-y-0.5">
                    {item.children.map(child => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                            isActive ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-100'
                          )
                        }
                      >
                        {child.label === 'Content Strategy and AI' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        )}
                        <span>{child.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-100'
                )
              }
            >
              <Icon className="w-5 h-5 text-slate-500" />
              <span className="flex-1">{item.label}</span>
              {item.hasChildren && <ChevronDown className="w-4 h-4 text-slate-400 -rotate-90" />}
            </NavLink>
          )
        })}
      </nav>

      <div className={cn('border-t border-slate-100 p-3', !expanded && 'flex justify-center')}>
        {expanded ? (
          <button className="w-full flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-slate-100 text-left">
            <span className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
              <User className="w-5 h-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-slate-900 truncate">Product</span>
              <span className="block text-xs text-slate-500 truncate">product@singleinterface.net</span>
            </span>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>
        ) : (
          <button
            className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
            aria-label="Profile"
          >
            <User className="w-5 h-5" />
          </button>
        )}
      </div>
    </aside>
  )
}
