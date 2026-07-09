import { useCallback, useMemo, useRef, useState } from 'react'
import {
  Upload,
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
} from 'lucide-react'
import { cn } from '../lib/utils.js'

const VERDICT_META = {
  correct: { label: 'Correct', tone: 'text-emerald-700 bg-emerald-50 border-emerald-200', Icon: CheckCircle2, dot: 'bg-emerald-500' },
  partially_incorrect: { label: 'Partially incorrect', tone: 'text-amber-700 bg-amber-50 border-amber-200', Icon: AlertTriangle, dot: 'bg-amber-500' },
  incorrect: { label: 'Incorrect', tone: 'text-rose-700 bg-rose-50 border-rose-200', Icon: XCircle, dot: 'bg-rose-500' },
  unverifiable: { label: 'Unverifiable', tone: 'text-slate-600 bg-slate-100 border-slate-200', Icon: HelpCircle, dot: 'bg-slate-400' },
}

const CIT_VERDICT_META = {
  reliable: { label: 'Reliable', tone: 'text-emerald-700 bg-emerald-50 border-emerald-200', Icon: CheckCircle2 },
  partially_unreliable: { label: 'Partially unreliable', tone: 'text-amber-700 bg-amber-50 border-amber-200', Icon: AlertTriangle },
  unreliable: { label: 'Unreliable', tone: 'text-rose-700 bg-rose-50 border-rose-200', Icon: XCircle },
  unreachable: { label: 'Unreachable', tone: 'text-slate-600 bg-slate-100 border-slate-200', Icon: HelpCircle },
}

const CLAIM_META = {
  SUPPORTED: { label: 'Supported', tone: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  CONTRADICTED: { label: 'Contradicted', tone: 'text-rose-700 bg-rose-50 border-rose-200' },
  NOT_FOUND: { label: 'Not found on brand site', tone: 'text-slate-600 bg-slate-100 border-slate-200' },
}

function VerdictPill({ verdict, meta = VERDICT_META }) {
  const m = meta[verdict] || meta.unverifiable || meta.unreachable
  const Icon = m.Icon
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border', m.tone)}>
      <Icon className="w-3.5 h-3.5" />
      {m.label}
    </span>
  )
}

function Section({ title, children, right }) {
  return (
    <section className="bg-white border border-slate-200 rounded-xl">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {right}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

function InputForm({ brandName, setBrandName, brandUrl, setBrandUrl, file, setFile, onRun, running }) {
  const fileInputRef = useRef(null)
  return (
    <Section title="Run the Data Checker">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <label className="block">
          <span className="text-xs font-medium text-slate-600">Brand name</span>
          <div className="mt-1 flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2 focus-within:border-blue-500">
            <Globe className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="e.g. IndusInd Bank"
              value={brandName}
              onChange={e => setBrandName(e.target.value)}
              disabled={running}
              className="w-full outline-none text-sm"
            />
          </div>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-600">Brand website URL</span>
          <div className="mt-1 flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2 focus-within:border-blue-500">
            <Link2 className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="https://www.indusind.com/"
              value={brandUrl}
              onChange={e => setBrandUrl(e.target.value)}
              disabled={running}
              className="w-full outline-none text-sm"
            />
          </div>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-600">LLM responses (.xlsx)</span>
          <div
            className={cn(
              'mt-1 flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer',
              file ? 'border-slate-300' : 'border-dashed border-slate-300 hover:border-blue-500'
            )}
            onClick={() => !running && fileInputRef.current?.click()}
          >
            <FileSpreadsheet className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-sm text-slate-700 truncate">
              {file ? file.name : 'Click to upload Excel file'}
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.xlsm"
              className="hidden"
              disabled={running}
              onChange={e => setFile(e.target.files?.[0] || null)}
            />
          </div>
        </label>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={onRun}
          disabled={running || !file || !brandUrl}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white',
            running || !file || !brandUrl
              ? 'bg-slate-300 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          )}
        >
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {running ? 'Running…' : 'Run Now'}
        </button>
        <span className="text-xs text-slate-500">
          Runs offline against the brand website you provide as canonical ground truth.
        </span>
      </div>
    </Section>
  )
}

function ProgressPanel({ progress, log }) {
  const { crawlDone, crawlTotal, responseDone, responseTotal, citationDone, citationTotal } = progress
  return (
    <Section title="Progress">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div>
          <div className="text-slate-500 text-xs">Brand crawl</div>
          <div className="mt-1 h-2 bg-slate-100 rounded overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{ width: crawlTotal ? `${Math.min(100, (crawlDone / crawlTotal) * 100)}%` : '0%' }}
            />
          </div>
          <div className="mt-1 text-slate-600 text-xs">{crawlDone}/{crawlTotal || '—'} pages</div>
        </div>
        <div>
          <div className="text-slate-500 text-xs">Responses judged</div>
          <div className="mt-1 h-2 bg-slate-100 rounded overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: responseTotal ? `${(responseDone / responseTotal) * 100}%` : '0%' }}
            />
          </div>
          <div className="mt-1 text-slate-600 text-xs">{responseDone}/{responseTotal || '—'}</div>
        </div>
        <div>
          <div className="text-slate-500 text-xs">Cited URLs checked</div>
          <div className="mt-1 h-2 bg-slate-100 rounded overflow-hidden">
            <div
              className="h-full bg-purple-500 transition-all"
              style={{ width: citationTotal ? `${(citationDone / citationTotal) * 100}%` : '0%' }}
            />
          </div>
          <div className="mt-1 text-slate-600 text-xs">{citationDone}/{citationTotal || '—'}</div>
        </div>
      </div>
      {log.length > 0 && (
        <div className="mt-3 max-h-32 overflow-y-auto text-xs text-slate-500 font-mono border-t border-slate-100 pt-2">
          {log.slice(-30).map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      )}
    </Section>
  )
}

function KpiStrip({ kpis }) {
  if (!kpis) return null
  const total = kpis.total_responses || 0
  const v = kpis.overall_verdicts || {}
  const tiles = [
    { label: 'Responses', value: total },
    { label: 'Accuracy', value: `${kpis.accuracy_pct || 0}%`, hint: `${v.correct || 0} of ${total} fully correct` },
    { label: 'Incorrect', value: (v.incorrect || 0) + (v.partially_incorrect || 0), hint: 'incl. partial', tone: 'text-rose-600' },
    { label: 'Unverifiable', value: v.unverifiable || 0, tone: 'text-slate-500' },
    { label: 'Cited URLs', value: kpis.total_citations || 0 },
    { label: 'Unreliable citations', value: (kpis.citation_verdicts?.unreliable || 0) + (kpis.citation_verdicts?.partially_unreliable || 0), tone: 'text-rose-600' },
  ]
  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
      {tiles.map(t => (
        <div key={t.label} className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">{t.label}</div>
          <div className={cn('mt-1 text-xl font-semibold', t.tone || 'text-slate-900')}>{t.value}</div>
          {t.hint && <div className="text-[11px] text-slate-500 mt-0.5">{t.hint}</div>}
        </div>
      ))}
    </div>
  )
}

function PlatformBreakdown({ kpis }) {
  if (!kpis?.by_platform) return null
  const entries = Object.entries(kpis.by_platform)
  return (
    <Section title="Accuracy by platform">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {entries.map(([p, s]) => {
          const total = s.total || 0
          const seg = k => (total ? (s[k] || 0) / total * 100 : 0)
          return (
            <div key={p} className="border border-slate-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-slate-900 capitalize">{p}</div>
                <div className="text-xs text-slate-500">
                  {(s.correct || 0)}/{total} correct
                </div>
              </div>
              <div className="mt-2 flex h-2 rounded overflow-hidden bg-slate-100">
                <div className="bg-emerald-500" style={{ width: seg('correct') + '%' }} />
                <div className="bg-amber-500" style={{ width: seg('partially_incorrect') + '%' }} />
                <div className="bg-rose-500" style={{ width: seg('incorrect') + '%' }} />
                <div className="bg-slate-400" style={{ width: seg('unverifiable') + '%' }} />
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-600">
                <span><span className="inline-block w-2 h-2 bg-emerald-500 rounded-sm mr-1" />Correct {s.correct || 0}</span>
                <span><span className="inline-block w-2 h-2 bg-amber-500 rounded-sm mr-1" />Partial {s.partially_incorrect || 0}</span>
                <span><span className="inline-block w-2 h-2 bg-rose-500 rounded-sm mr-1" />Incorrect {s.incorrect || 0}</span>
                <span><span className="inline-block w-2 h-2 bg-slate-400 rounded-sm mr-1" />Unverifiable {s.unverifiable || 0}</span>
              </div>
            </div>
          )
        })}
      </div>
    </Section>
  )
}

function ResponseRow({ row }) {
  const [open, setOpen] = useState(false)
  const meta = VERDICT_META[row.verdict] || VERDICT_META.unverifiable
  return (
    <div className={cn('border rounded-lg', meta.tone.replace(/text-\S+|bg-\S+/g, '').trim() || 'border-slate-200')}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-start gap-3 p-3 text-left hover:bg-slate-50 rounded-lg"
      >
        <span className={cn('mt-1.5 w-2 h-2 rounded-full shrink-0', meta.dot)} />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <VerdictPill verdict={row.verdict} />
            <span className="text-xs font-medium text-slate-800 capitalize">{row.platform}</span>
            {row.city && <span className="text-[11px] text-slate-500">{row.city}{row.state ? `, ${row.state}` : ''}</span>}
            <span className="text-[11px] text-slate-400">#{row.id}</span>
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
          <div>
            <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">Claims</div>
            <div className="space-y-2">
              {(row.claims || []).map((c, i) => {
                const cm = CLAIM_META[c.verdict] || CLAIM_META.NOT_FOUND
                return (
                  <div key={i} className="border border-slate-200 rounded-md p-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm text-slate-800">{c.text}</div>
                      <span className={cn('text-[11px] font-medium border rounded-full px-2 py-0.5 shrink-0', cm.tone)}>{cm.label}</span>
                    </div>
                    {c.evidence && (
                      <div className="mt-1 text-xs text-slate-600 italic border-l-2 border-slate-200 pl-2">
                        "{c.evidence}"
                      </div>
                    )}
                    {c.source_url && (
                      <a href={c.source_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[11px] text-blue-600 hover:underline break-all">
                        {c.source_url}
                      </a>
                    )}
                  </div>
                )
              })}
              {!row.claims?.length && <div className="text-xs text-slate-500">No claims extracted.</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ResponsesTable({ results }) {
  const [platform, setPlatform] = useState('all')
  const [verdict, setVerdict] = useState('all')

  const platforms = useMemo(() => ['all', ...new Set(results.map(r => r.platform))], [results])
  const verdicts = ['all', 'incorrect', 'partially_incorrect', 'correct', 'unverifiable']

  const filtered = results.filter(r =>
    (platform === 'all' || r.platform === platform) &&
    (verdict === 'all' || r.verdict === verdict)
  )

  return (
    <Section
      title={`LLM responses (${filtered.length}/${results.length})`}
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
        {filtered.map(r => <ResponseRow key={r.id} row={r} />)}
        {!filtered.length && <div className="text-sm text-slate-500">No rows.</div>}
      </div>
    </Section>
  )
}

function CitedUrlsTable({ results }) {
  const [verdict, setVerdict] = useState('all')
  const filtered = results.filter(r => verdict === 'all' || r.verdict === verdict)
  return (
    <Section
      title={`Cited URLs (${filtered.length}/${results.length})`}
      right={
        <select className="border border-slate-300 rounded px-2 py-1 bg-white text-xs" value={verdict} onChange={e => setVerdict(e.target.value)}>
          {['all', 'unreliable', 'partially_unreliable', 'reliable', 'unreachable'].map(v => (
            <option key={v} value={v}>{v === 'all' ? 'All verdicts' : (CIT_VERDICT_META[v]?.label || v)}</option>
          ))}
        </select>
      }
    >
      {!results.length ? (
        <div className="text-sm text-slate-500">
          No citation data found. Provide a second sheet with URL columns (e.g. <code>url</code>, <code>cited_by</code>) or include http(s) links directly in the response text.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c, i) => (
            <div key={i} className="border border-slate-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <VerdictPill verdict={c.verdict} meta={CIT_VERDICT_META} />
                <a href={c.url} target="_blank" rel="noreferrer" className="text-sm text-blue-700 hover:underline break-all">
                  {c.title || c.url}
                </a>
              </div>
              <div className="text-xs text-slate-500 mt-1 break-all">{c.url}</div>
              {c.summary && <div className="text-sm text-slate-700 mt-2">{c.summary}</div>}
              {c.issues?.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs">
                  {c.issues.map((iss, j) => (
                    <li key={j} className="border-l-2 border-rose-300 pl-2">
                      <span className="font-medium text-rose-700 uppercase text-[10px] tracking-wide">{iss.type}</span>
                      <span className="text-slate-700"> — {iss.detail}</span>
                      {iss.evidence && <div className="italic text-slate-500 mt-0.5">"{iss.evidence}"</div>}
                    </li>
                  ))}
                </ul>
              )}
              {c.cited_by?.length > 0 && (
                <div className="text-[11px] text-slate-500 mt-2">Cited by response(s): {c.cited_by.join(', ')}</div>
              )}
            </div>
          ))}
          {!filtered.length && <div className="text-sm text-slate-500">No rows.</div>}
        </div>
      )}
    </Section>
  )
}

export default function DataChecker() {
  const [brandName, setBrandName] = useState('IndusInd Bank')
  const [brandUrl, setBrandUrl] = useState('https://www.indusind.com/')
  const [file, setFile] = useState(null)
  const [running, setRunning] = useState(false)
  const [log, setLog] = useState([])
  const [progress, setProgress] = useState({
    crawlDone: 0, crawlTotal: 0,
    responseDone: 0, responseTotal: 0,
    citationDone: 0, citationTotal: 0,
  })
  const [responses, setResponses] = useState([])
  const [citedUrls, setCitedUrls] = useState([])
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const appendLog = useCallback((line) => setLog(l => [...l, line]), [])

  const run = async () => {
    if (!file || !brandUrl) return
    setRunning(true)
    setError(null)
    setLog([])
    setResponses([])
    setCitedUrls([])
    setResult(null)
    setProgress({ crawlDone: 0, crawlTotal: 0, responseDone: 0, responseTotal: 0, citationDone: 0, citationTotal: 0 })

    const fd = new FormData()
    fd.append('file', file)
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
          try {
            const evt = JSON.parse(payload)
            handleEvent(evt)
          } catch {
            // ignore parse error
          }
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
        appendLog(`Loaded ${evt.responseCount} responses, ${evt.citationCount} citation rows from ${evt.sheets.join(', ')}`)
        setProgress(p => ({ ...p, responseTotal: Math.min(evt.responseCount, 60) }))
        break
      case 'crawl':
        if (evt.stage === 'fetched') {
          setProgress(p => ({ ...p, crawlDone: evt.done, crawlTotal: evt.total }))
        } else if (evt.stage === 'done') {
          appendLog(`Crawl complete: ${evt.pages} pages usable.`)
        }
        break
      case 'response_start':
        setProgress(p => ({ ...p, responseTotal: evt.total }))
        break
      case 'response_done':
        setResponses(rs => [...rs, evt.row])
        setProgress(p => ({ ...p, responseDone: evt.index + 1, responseTotal: evt.total }))
        break
      case 'citation_start':
        setProgress(p => ({ ...p, citationTotal: evt.total }))
        break
      case 'citation_done':
        setCitedUrls(cs => [...cs, evt.row])
        setProgress(p => ({ ...p, citationDone: evt.index + 1, citationTotal: evt.total }))
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

  return (
    <div className="max-w-6xl space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Data Checker</h1>
          <p className="text-sm text-slate-500 mt-1">
            Verifies factual correctness of LLM responses (and their cited URLs) against the brand website you provide as ground truth.
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
        file={file} setFile={setFile}
        onRun={run} running={running}
      />

      {(running || log.length > 0) && <ProgressPanel progress={progress} log={log} />}

      {error && (
        <div className="border border-rose-200 bg-rose-50 text-rose-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {(responses.length > 0 || result) && (
        <>
          {result && <KpiStrip kpis={result.kpis} />}
          {result && <PlatformBreakdown kpis={result.kpis} />}
          <ResponsesTable results={responses} />
          <CitedUrlsTable results={citedUrls} />
        </>
      )}
    </div>
  )
}
