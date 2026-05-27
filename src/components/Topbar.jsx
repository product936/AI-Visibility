import { useState } from 'react'
import { MapPin, Plus, Globe, HelpCircle, ChevronDown } from 'lucide-react'

export default function Topbar() {
  const [aiMode, setAiMode] = useState(false)

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6 gap-4 shrink-0">
      <div className="font-semibold text-slate-900">IndusInd Bank</div>

      <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-700 hover:bg-slate-50">
        <MapPin className="w-4 h-4 text-blue-600" />
        <span>All Locations</span>
        <ChevronDown className="w-4 h-4 text-slate-400" />
      </button>

      <button
        className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-blue-600 hover:bg-slate-50"
        aria-label="Add location"
      >
        <Plus className="w-4 h-4" />
      </button>

      <div className="ml-auto flex items-center gap-3">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-sm font-medium">
          <span className="w-4 h-4 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px]">¤</span>
          <span>2,450</span>
        </div>

        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-700 hover:bg-slate-50">
          <svg className="w-4 h-4" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/><path fill="#FF3D00" d="m6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"/><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/></svg>
          <span>Connect with Google</span>
        </button>

        <div className="flex items-center gap-2 text-sm text-slate-700">
          <span>AI Mode</span>
          <button
            onClick={() => setAiMode(v => !v)}
            className={`w-9 h-5 rounded-full p-0.5 transition-colors ${aiMode ? 'bg-blue-600' : 'bg-slate-300'}`}
            aria-label="Toggle AI Mode"
          >
            <span className={`block w-4 h-4 rounded-full bg-white transition-transform ${aiMode ? 'translate-x-4' : ''}`} />
          </button>
        </div>

        <button className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm text-slate-700 hover:bg-slate-50">
          <Globe className="w-4 h-4" />
          <span>EN</span>
        </button>

        <button
          className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500"
          aria-label="Help"
        >
          <HelpCircle className="w-5 h-5" />
        </button>
      </div>
    </header>
  )
}
