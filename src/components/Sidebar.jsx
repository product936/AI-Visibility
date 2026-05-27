import { NavLink } from 'react-router-dom'
import {
  Lightbulb,
  Radar,
  ScanLine,
  Star,
  FileText,
  MessageSquare,
  Users,
  ClipboardCheck,
  Menu,
  User,
} from 'lucide-react'
import { cn } from '../lib/utils.js'

const items = [
  { to: '/insights', icon: Lightbulb, label: 'Insights' },
  { to: '/radar', icon: Radar, label: 'Radar' },
  { to: '/scan', icon: ScanLine, label: 'Scan' },
  { to: '/favorites', icon: Star, label: 'Favorites' },
  { to: '/content-strategy', icon: FileText, label: 'Pages AI' },
  { to: '/conversations', icon: MessageSquare, label: 'Conversations' },
  { to: '/audience', icon: Users, label: 'Audience' },
  { to: '/reports', icon: ClipboardCheck, label: 'Reports' },
]

export default function Sidebar() {
  return (
    <aside className="w-[72px] bg-white border-r border-slate-200 flex flex-col items-center py-4 shrink-0">
      <button
        className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 mb-4"
        aria-label="Toggle menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      <nav className="flex flex-col gap-1 mt-2">
        {items.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            title={label}
            className={({ isActive }) =>
              cn(
                'w-10 h-10 rounded-lg flex items-center justify-center transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
              )
            }
          >
            <Icon className="w-5 h-5" />
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto">
        <button
          className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600"
          aria-label="Profile"
        >
          <User className="w-5 h-5" />
        </button>
      </div>
    </aside>
  )
}
