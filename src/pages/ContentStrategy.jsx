import { useState } from 'react'
import {
  ChevronRight,
  Home,
  Sparkles,
  ChevronDown,
  MapPin,
  Info,
  Eye,
  ShieldCheck,
  AlertTriangle,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  ExternalLink,
  SlidersHorizontal,
  TrendingUp,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import KpiCards from '../components/ContentStrategy/KpiCards.jsx'
import ProductMatrix from '../components/ContentStrategy/ProductMatrix.jsx'
import ShareOfVoice from '../components/ContentStrategy/ShareOfVoice.jsx'
import CitationOwnership from '../components/ContentStrategy/CitationOwnership.jsx'
import CitationCategories from '../components/ContentStrategy/CitationCategories.jsx'
import TopSources from '../components/ContentStrategy/TopSources.jsx'
import CitationDetail from '../components/ContentStrategy/CitationDetail.jsx'

export default function ContentStrategy() {
  const [tab, setTab] = useState('visibility')

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <header className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-[26px] font-semibold text-slate-900 tracking-tight">
            Content Strategy &amp; AI Visibility
          </h1>
          <p className="mt-1 text-slate-500">
            Monitor how IndusInd Bank appears in AI answers — and close the gaps
          </p>
          <nav className="mt-2 flex items-center gap-1.5 text-sm text-slate-500">
            <Home className="w-4 h-4" />
            <ChevronRight className="w-3.5 h-3.5" />
            <span>Pages AI</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-700">Content Strategy &amp; AI Visibility</span>
          </nav>
        </div>

        <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 shrink-0">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span>All Answer Engines</span>
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </button>
      </header>

      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab('visibility')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'visibility' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Eye className="w-4 h-4" />
          AI Visibility
        </button>
        <button
          onClick={() => setTab('content')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'content' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <FileText className="w-4 h-4" />
          Content Management
        </button>
      </div>

      {tab === 'visibility' ? (
        <>
          <div className="flex items-center justify-between gap-4 bg-blue-50/60 border border-blue-100 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                Showing AI visibility insights for <span className="font-medium">100 IndusInd Bank branches</span>. Expand to all branches for complete coverage.
              </span>
            </div>
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 hover:bg-slate-50 shrink-0">
              <MapPin className="w-4 h-4 text-blue-600" />
              100 locations
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          <KpiCards />
          <ProductMatrix />
          <ShareOfVoice />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CitationOwnership />
            <CitationCategories />
          </div>

          <TopSources />
          <CitationDetail />
        </>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <FileText className="w-10 h-10 mx-auto text-slate-300" />
          <h3 className="mt-3 font-medium text-slate-900">Content Management</h3>
          <p className="mt-1 text-sm text-slate-500">Plan, draft, and publish AI-optimized content. (Prototype placeholder.)</p>
        </div>
      )}
    </div>
  )
}
