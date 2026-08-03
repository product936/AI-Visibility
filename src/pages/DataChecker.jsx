import { useCallback, useMemo, useRef, useState } from 'react'
import {
  Play,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Loader2,
  Globe,
  Link2,
  FileSpreadsheet,
  ChevronDown,
  ChevronRight,
  X,
  Search,
  BookOpen,
} from 'lucide-react'
import { cn } from '../lib/utils.js'

const VERDICT_META = {
  correct: { label: 'Correct', tone: 'text-emerald-700 bg-emerald-50 border-emerald-200', Icon: CheckCircle2, dot: 'bg-emerald-500' },
  partially_incorrect: { label: 'Partially incorrect', tone: 'text-amber-700 bg-amber-50 border-amber-200', Icon: AlertTriangle, dot: 'bg-amber-500' },
  incorrect: { label: 'Incorrect', tone: 'text-rose-700 bg-rose-50 border-rose-200', Icon: XCircle, dot: 'bg-rose-500' },
  unverifiable: { label: 'Unverifiable', tone: 'text-slate-600 bg-slate-100 border-slate-200', Icon: HelpCircle, dot: 'bg-slate-400' },
  no_brand_page: { label: 'No brand page', tone: 'text-slate-700 bg-slate-100 border-slate-300', Icon: HelpCircle, dot: 'bg-slate-400' },
}

const CLAIM_META = {
  SUPPORTED: { label: 'Supported', tone: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  CONTRADICTED: { label: 'Contradicted', tone: 'text-rose-700 bg-rose-50 border-rose-200' },
  NOT_FOUND: { label: 'Not on brand page', tone: 'text-slate-600 bg-slate-100 border-slate-200' },
}

function VerdictPill({ verdict }) {
  const m = VERDICT_META[verdict] || VERDICT_META.unverifiable
  const Icon = m.Icon
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border', m.tone)}>
      <Icon className="w-3.5 h-3.5" />
      {m.label}
    </span>
  )
}

function Section({ title, children, right, id }) {
  return (
    <section id={id} className="bg-white border border-slate-200 rounded-xl scroll-mt-4">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {right}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

function FileField({ label, hint, file, onFile, disabled }) {
  const ref = useRef(null)
  return (
    <div>
      <div className="text-xs font-medium text-slate-600">{label}</div>
      <div
        className={cn(
          'mt-1 flex items-center gap-2 border rounded-lg px-3 py-2',
          disabled ? 'bg-slate-50 border-slate-200 cursor-not-allowed' : 'cursor-pointer',
          file ? 'border-slate-300' : 'border-dashed border-slate-300 hover:border-blue-500'
        )}
        onClick={() => !disabled && ref.current?.click()}
      >
        <FileSpreadsheet className="w-4 h-4 text-slate-400 shrink-0" />
        <span className="text-sm text-slate-700 truncate flex-1">
          {file ? file.name : `Click to upload ${label.toLowerCase()}`}
        </span>
        {file && !disabled && (
          <button
            className="text-slate-400 hover:text-slate-700"
            onClick={e => { e.stopPropagation(); onFile(null) }}
            aria-label="Remove"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <input
          ref={ref}
          type="file"
          accept=".xlsx,.xls,.xlsm"
          className="hidden"
          disabled={disabled}
          onChange={e => onFile(e.target.files?.[0] || null)}
        />
      </div>
      {hint && <div className="text-[11px] text-slate-500 mt-1">{hint}</div>}
    </div>
  )
}

function InputForm({ brandName, setBrandName, brandUrl, setBrandUrl, mentionsFile, setMentionsFile, citationsFile, setCitationsFile, onRun, running, canRun }) {
  return (
    <Section title="Run the Data Checker">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-xs font-medium text-slate-600">Brand name</span>
          <div className="mt-1 flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2 focus-within:border-blue-500">
            <Globe className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="e.g. Mahindra"
              value={brandName}
              onChange={e => setBrandName(e.target.value)}
              disabled={running}
              className="w-full outline-none text-sm bg-transparent"
            />
          </div>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-600">Brand website URL</span>
          <div className="mt-1 flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2 focus-within:border-blue-500">
            <Link2 className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="https://auto.mahindra.com/"
              value={brandUrl}
              onChange={e => setBrandUrl(e.target.value)}
              disabled={running}
              className="w-full outline-none text-sm bg-transparent"
            />
          </div>
        </label>
        <FileField
          label="Mentions Excel"
          hint="Required. Columns: master_outlet_id, id (=response_id), question_text, platform, ai_response"
          file={mentionsFile}
          onFile={setMentionsFile}
          disabled={running}
        />
        <FileField
          label="Citations Excel"
          hint="Required. Columns: master_outlet_id, response_id, url, ownership"
          file={citationsFile}
          onFile={setCitationsFile}
          disabled={running}
        />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={onRun}
          disabled={!canRun || running}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white',
            !canRun || running
              ? 'bg-slate-300 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          )}
        >
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {running ? 'Running…' : 'Run Now'}
        </button>
        <span className="text-xs text-slate-500">
          For each prompt: use its cited brand URLs if any; else search the brand website; else flag as "No Brand Page".
        </span>
      </div>
    </Section>
  )
}

function ProgressPanel({ progress, log }) {
  const { responseDone, responseTotal } = progress
  return (
    <Section title="Progress">
      <div className="text-sm">
        <div className="text-slate-500 text-xs">Responses analysed</div>
        <div className="mt-1 h-2 bg-slate-100 rounded overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: responseTotal ? `${(responseDone / responseTotal) * 100}%` : '0%' }}
          />
        </div>
        <div className="mt-1 text-slate-600 text-xs">{responseDone}/{responseTotal || '—'}</div>
      </div>
      {log.length > 0 && (
        <div className="mt-3 max-h-32 overflow-y-auto text-xs text-slate-500 font-mono border-t border-slate-100 pt-2">
          {log.slice(-30).map((l, i) => (<div key={i}>{l}</div>))}
        </div>
      )}
    </Section>
  )
}

function KpiTile({ label, value, hint, tone, onClick, active }) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'text-left bg-white border rounded-xl p-4 transition-shadow',
        onClick ? 'hover:shadow-md cursor-pointer' : 'cursor-default',
        active ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200'
      )}
    >
      <div className="text-xs text-slate-500">{label}</div>
      <div className={cn('mt-1 text-2xl font-semibold', tone || 'text-slate-900')}>{value}</div>
      {hint && <div className="text-[11px] text-slate-500 mt-0.5">{hint}</div>}
    </button>
  )
}

function KpiRow({ kpis, active, setActive, jumpTo }) {
  if (!kpis) return null
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <KpiTile
        label="Total Prompts Analysed"
        value={kpis.total_analyzed || 0}
        hint={`${kpis.total_judged || 0} judged against a brand page · ${kpis.prompts_no_brand_page || 0} without one`}
      />
      <KpiTile
        label="Prompts with Incorrect Data"
        value={kpis.prompts_incorrect || 0}
        hint="click to see the incorrect vs correct values"
        tone="text-rose-600"
        onClick={() => { setActive('incorrect'); jumpTo('incorrect') }}
        active={active === 'incorrect'}
      />
      <KpiTile
        label="Prompts with No Brand Page"
        value={kpis.prompts_no_brand_page || 0}
        hint="click to see the prompt list"
        tone="text-amber-700"
        onClick={() => { setActive('no_brand'); jumpTo('no_brand') }}
        active={active === 'no_brand'}
      />
    </div>
  )
}

function BrandSourceBadge({ source }) {
  if (!source) return null
  const map = {
    cited: { label: 'brand URL cited', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200', Icon: CheckCircle2 },
    searched: { label: 'brand page found by search', tone: 'bg-blue-50 text-blue-700 border-blue-200', Icon: Search },
    none: { label: 'no brand page', tone: 'bg-slate-100 text-slate-600 border-slate-200', Icon: HelpCircle },
  }
  const m = map[source] || map.none
  const Icon = m.Icon
  return (
    <span className={cn('inline-flex items-center gap-1 border rounded-full px-2 py-0.5 text-[11px] font-medium', m.tone)}>
      <Icon className="w-3 h-3" />
      {m.label}
    </span>
  )
}

function IncorrectDrilldown({ rows }) {
  if (!rows.length) return <div className="text-sm text-slate-500">No prompts with incorrect data.</div>
  return (
    <div className="space-y-3">
      {rows.map(r => {
        const contradicted = (r.claims || []).filter(c => c.verdict === 'CONTRADICTED')
        return (
          <div key={r.pk} className="border border-rose-200 rounded-lg p-3 bg-rose-50/40">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <VerdictPill verdict={r.verdict} />
              <span className="text-xs font-medium text-slate-800 capitalize">{r.platform}</span>
              {r.product && <span className="text-[11px] text-slate-600 bg-white border border-slate-200 rounded px-1.5 py-0.5">{r.product}</span>}
              <BrandSourceBadge source={r.brand_source} />
              <span className="text-[11px] text-slate-500 ml-auto">#{r.response_id}</span>
            </div>
            <div className="text-sm text-slate-800 mb-2">{r.query}</div>
            {r.summary && <div className="text-xs text-slate-600 mb-2">{r.summary}</div>}
            {contradicted.length === 0 ? (
              <div className="text-xs text-slate-500 italic">Model flagged the response as {r.verdict.replace(/_/g, ' ')} but returned no CONTRADICTED claims.</div>
            ) : (
              <div className="space-y-2">
                {contradicted.map((c, i) => (
                  <div key={i} className="bg-white border border-rose-200 rounded p-2 text-xs">
                    <div className="text-slate-800 font-medium">{c.text}</div>
                    <div className="mt-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div className="bg-rose-50 rounded p-2">
                        <div className="text-[10px] uppercase tracking-wide text-rose-700 mb-0.5">Response said (incorrect)</div>
                        <div className="text-rose-900">{c.incorrect_data || '—'}</div>
                      </div>
                      <div className="bg-emerald-50 rounded p-2">
                        <div className="text-[10px] uppercase tracking-wide text-emerald-700 mb-0.5">Brand page says (correct)</div>
                        <div className="text-emerald-900">{c.correct_data || '—'}</div>
                      </div>
                    </div>
                    {c.evidence && (
                      <div className="mt-1 italic text-slate-600">"{c.evidence}"</div>
                    )}
                    {c.source_url && (
                      <a href={c.source_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-blue-700 hover:underline break-all">
                        {c.source_url}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function NoBrandPageDrilldown({ rows }) {
  if (!rows.length) return <div className="text-sm text-slate-500">All analysed prompts had at least one brand page.</div>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-slate-500 border-b border-slate-200">
            <th className="py-1 pr-3">Platform</th>
            <th className="py-1 pr-3">Product</th>
            <th className="py-1 pr-3">Response ID</th>
            <th className="py-1">Query</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.pk} className="border-b border-slate-100">
              <td className="py-1 pr-3 capitalize text-slate-800">{r.platform}</td>
              <td className="py-1 pr-3 text-slate-700">{r.product || '—'}</td>
              <td className="py-1 pr-3 text-slate-500">#{r.response_id}</td>
              <td className="py-1 text-slate-700">{r.query}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ResponseRow({ row, defaultOpen }) {
  const [open, setOpen] = useState(!!defaultOpen)
  return (
    <div className="border border-slate-200 rounded-lg">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-start gap-3 p-3 text-left hover:bg-slate-50 rounded-lg"
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <VerdictPill verdict={row.verdict} />
            <span className="text-xs font-medium text-slate-800 capitalize">{row.platform}</span>
            {row.product && <span className="text-[11px] text-slate-600 bg-slate-100 rounded px-1.5 py-0.5">{row.product}</span>}
            <BrandSourceBadge source={row.brand_source} />
            <span className="text-[11px] text-slate-400 ml-auto">#{row.response_id}</span>
          </div>
          <div className="mt-1 text-sm text-slate-800 line-clamp-1">{row.query}</div>
          <div className="text-xs text-slate-500 line-clamp-2 mt-0.5">{row.summary}</div>
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 mt-1" /> : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 mt-1" />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-100 space-y-3">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">LLM response</div>
            <div className="text-sm text-slate-800 whitespace-pre-wrap max-h-64 overflow-y-auto bg-slate-50 rounded p-3">
              {row.response}
            </div>
          </div>
          {row.brand_pages_used?.length > 0 && (
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1 flex items-center gap-1">
                <BookOpen className="w-3 h-3" /> Brand pages used as ground truth
              </div>
              <ul className="space-y-1">
                {row.brand_pages_used.map((s, i) => (
                  <li key={i} className="text-xs">
                    <a href={s.url} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline break-all">
                      {s.title || s.url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {row.claims?.length > 0 && (
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">Claims</div>
              <div className="space-y-2">
                {row.claims.map((c, i) => {
                  const cm = CLAIM_META[c.verdict] || CLAIM_META.NOT_FOUND
                  return (
                    <div key={i} className="border border-slate-200 rounded-md p-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-sm text-slate-800">{c.text}</div>
                        <span className={cn('text-[11px] font-medium border rounded-full px-2 py-0.5 shrink-0', cm.tone)}>{cm.label}</span>
                      </div>
                      {c.verdict === 'CONTRADICTED' && (c.incorrect_data || c.correct_data) && (
                        <div className="mt-1 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                          <div className="bg-rose-50 rounded p-2">
                            <div className="text-[10px] uppercase tracking-wide text-rose-700 mb-0.5">Response said</div>
                            <div className="text-rose-900">{c.incorrect_data || '—'}</div>
                          </div>
                          <div className="bg-emerald-50 rounded p-2">
                            <div className="text-[10px] uppercase tracking-wide text-emerald-700 mb-0.5">Brand page says</div>
                            <div className="text-emerald-900">{c.correct_data || '—'}</div>
                          </div>
                        </div>
                      )}
                      {c.evidence && (
                        <div className="mt-1 text-xs text-slate-600 italic border-l-2 border-slate-200 pl-2">"{c.evidence}"</div>
                      )}
                      {c.source_url && (
                        <a href={c.source_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[11px] text-blue-600 hover:underline break-all">
                          {c.source_url}
                        </a>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ResponsesTable({ results }) {
  const [platform, setPlatform] = useState('all')
  const [verdict, setVerdict] = useState('all')

  const platforms = useMemo(() => ['all', ...new Set(results.map(r => r.platform))], [results])
  const verdicts = ['all', 'incorrect', 'partially_incorrect', 'correct', 'unverifiable', 'no_brand_page']

  const filtered = results.filter(r =>
    (platform === 'all' || r.platform === platform) &&
    (verdict === 'all' || r.verdict === verdict)
  )

  return (
    <Section
      title={`All prompts (${filtered.length}/${results.length})`}
      right={
        <div className="flex items-center gap-2 text-xs">
          <select className="border border-slate-300 rounded px-2 py-1 bg-white" value={platform} onChange={e => setPlatform(e.target.value)}>
            {platforms.map(p => <option key={p} value={p}>{p === 'all' ? 'All platforms' : p}</option>)}
          </select>
          <select className="border border-slate-300 rounded px-2 py-1 bg-white" value={verdict} onChange={e => setVerdict(e.target.value)}>
            {verdicts.map(v => <option key={v} value={v}>{v === 'all' ? 'All verdicts' : (VERDICT_META[v]?.label || v)}</option>)}
          </select>
        </div>
      }
    >
      <div className="space-y-2">
        {filtered.map(r => <ResponseRow key={r.pk} row={r} />)}
        {!filtered.length && <div className="text-sm text-slate-500">No rows.</div>}
      </div>
    </Section>
  )
}

export default function DataChecker() {
  const [brandName, setBrandName] = useState('Mahindra')
  const [brandUrl, setBrandUrl] = useState('https://auto.mahindra.com/')
  const [mentionsFile, setMentionsFile] = useState(null)
  const [citationsFile, setCitationsFile] = useState(null)
  const [running, setRunning] = useState(false)
  const [log, setLog] = useState([])
  const [progress, setProgress] = useState({ responseDone: 0, responseTotal: 0 })
  const [responses, setResponses] = useState([])
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [activeDrill, setActiveDrill] = useState(null)

  const appendLog = useCallback((line) => setLog(l => [...l, line]), [])
  const canRun = Boolean(mentionsFile && citationsFile && brandUrl.trim())

  const run = async () => {
    if (!canRun) return
    setRunning(true)
    setError(null)
    setLog([])
    setResponses([])
    setResult(null)
    setActiveDrill(null)
    setProgress({ responseDone: 0, responseTotal: 0 })

    const fd = new FormData()
    fd.append('mentionsFile', mentionsFile)
    fd.append('citationsFile', citationsFile)
    fd.append('brandName', brandName)
    fd.append('brandUrl', brandUrl)

    try {
      const res = await fetch('/api/check', { method: 'POST', body: fd })
      if (!res.ok || !res.body) {
        const txt = await res.text().catch(() => '')
        throw new Error(`Server error ${res.status}: ${txt.slice(0, 200)}`)
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        let idx
        while ((idx = buf.indexOf('\n\n')) !== -1) {
          const raw = buf.slice(0, idx).trim()
          buf = buf.slice(idx + 2)
          if (!raw.startsWith('data:')) continue
          const payload = raw.replace(/^data:\s*/, '')
          try { handleEvent(JSON.parse(payload)) } catch { /* ignore */ }
        }
      }
    } catch (e) {
      setError(String(e.message || e))
    } finally {
      setRunning(false)
    }
  }

  const handleEvent = (evt) => {
    switch (evt.type) {
      case 'log':
        appendLog(evt.message)
        break
      case 'loaded':
        appendLog(`Loaded ${evt.mentions_count} mentions, ${evt.citations_count} citations · will analyse ${evt.responses_to_analyze}`)
        setProgress(p => ({ ...p, responseTotal: evt.responses_to_analyze }))
        break
      case 'discovery_done':
        appendLog(`Brand corpus: ${evt.corpus_size} URLs`)
        break
      case 'response_done':
        setResponses(rs => [...rs, evt.row])
        setProgress(p => ({ ...p, responseDone: evt.done ?? p.responseDone + 1, responseTotal: evt.total }))
        break
      case 'done':
        setResult(evt.result)
        appendLog('Done.')
        break
      case 'error':
        setError(evt.error)
        appendLog(`ERROR: ${evt.error}`)
        break
      default:
        break
    }
  }

  const jumpTo = (id) => {
    setTimeout(() => {
      const el = document.getElementById(id)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 20)
  }

  const download = () => {
    if (!result) return
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `data-checker-${(result.brand_name || 'brand').replace(/\W+/g, '_').toLowerCase()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const incorrectRows = useMemo(() => responses.filter(r => r.verdict === 'incorrect' || r.verdict === 'partially_incorrect'), [responses])
  const noBrandRows = useMemo(() => responses.filter(r => r.verdict === 'no_brand_page'), [responses])

  return (
    <div className="max-w-6xl space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Data Checker</h1>
          <p className="text-sm text-slate-500 mt-1">
            For each prompt: use its cited brand URLs if any; otherwise search the brand website for relevant pages; otherwise flag as "No Brand Page". Third-party citations are ignored.
          </p>
        </div>
        {result && (
          <button onClick={download} className="text-xs px-3 py-1.5 border border-slate-300 rounded hover:bg-slate-50">
            Download JSON
          </button>
        )}
      </div>

      <InputForm
        brandName={brandName} setBrandName={setBrandName}
        brandUrl={brandUrl} setBrandUrl={setBrandUrl}
        mentionsFile={mentionsFile} setMentionsFile={setMentionsFile}
        citationsFile={citationsFile} setCitationsFile={setCitationsFile}
        onRun={run} running={running} canRun={canRun}
      />

      {(running || log.length > 0) && <ProgressPanel progress={progress} log={log} />}

      {error && (
        <div className="border border-rose-200 bg-rose-50 text-rose-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {(responses.length > 0 || result) && (
        <>
          <KpiRow kpis={result?.kpis || liveKpis(responses)} active={activeDrill} setActive={setActiveDrill} jumpTo={jumpTo} />
          <Section id="incorrect" title={`Prompts with Incorrect Data (${incorrectRows.length})`}>
            <IncorrectDrilldown rows={incorrectRows} />
          </Section>
          <Section id="no_brand" title={`Prompts with No Brand Page (${noBrandRows.length})`}>
            <NoBrandPageDrilldown rows={noBrandRows} />
          </Section>
          <ResponsesTable results={responses} />
        </>
      )}
    </div>
  )
}

// Compute the same KPIs client-side so the tiles are live while judgement is in progress.
function liveKpis(responses) {
  const overall = { correct: 0, partially_incorrect: 0, incorrect: 0, unverifiable: 0, no_brand_page: 0 }
  for (const r of responses) overall[r.verdict] = (overall[r.verdict] || 0) + 1
  const total = responses.length
  const judged = total - overall.no_brand_page
  return {
    total_analyzed: total,
    total_judged: judged,
    prompts_incorrect: overall.incorrect + overall.partially_incorrect,
    prompts_no_brand_page: overall.no_brand_page,
    overall_verdicts: overall,
    accuracy_pct: judged ? Math.round((overall.correct / judged) * 100) : 0,
  }
}
