import * as XLSX from 'xlsx'

// Normalize column names -> canonical keys
const RESPONSE_ALIASES = {
  id: ['id', 'response_id', 'row_id', 'sn', 'sr_no'],
  query: ['question_text', 'question', 'query', 'prompt', 'prompt_text'],
  platform: ['platform', 'model', 'llm', 'engine'],
  response: ['ai_response', 'response', 'answer', 'output'],
  city: ['city'],
  state: ['state'],
  run: ['run', 'run_idx', 'run_no', 'iteration'],
}

const CITATION_ALIASES = {
  id: ['id', 'citation_id'],
  url: ['url', 'citation_url', 'link', 'source_url'],
  cited_by: ['cited_by', 'cited_by_id', 'response_id', 'prompt_id', 'question_id'],
  title: ['title', 'page_title'],
  snippet: ['snippet', 'text', 'excerpt'],
}

function normalizeHeader(h) {
  return String(h || '').trim().toLowerCase().replace(/\s+/g, '_')
}

function matchKey(header, aliases) {
  const n = normalizeHeader(header)
  for (const [canon, opts] of Object.entries(aliases)) {
    if (opts.includes(n)) return canon
  }
  return null
}

function sheetToObjects(ws, aliases) {
  const rows = XLSX.utils.sheet_to_json(ws, { defval: null, raw: false })
  if (!rows.length) return []
  const headers = Object.keys(rows[0])
  const map = {}
  for (const h of headers) {
    const canon = matchKey(h, aliases)
    if (canon) map[h] = canon
  }
  return rows.map((r, i) => {
    const out = { _rowIdx: i + 2 }
    for (const h of headers) {
      const canon = map[h]
      if (canon) out[canon] = r[h]
      else out[`_${normalizeHeader(h)}`] = r[h]
    }
    return out
  })
}

function guessSheet(wb, kind) {
  const names = wb.SheetNames
  const lower = names.map(n => n.toLowerCase())
  if (kind === 'response') {
    const hit = lower.findIndex(n => /(response|answer|llm|sheet1|prompt|query)/.test(n))
    return names[hit >= 0 ? hit : 0]
  }
  if (kind === 'citation') {
    const hit = lower.findIndex(n => /(citation|source|url|reference|sheet2)/.test(n))
    return hit >= 0 ? names[hit] : null
  }
  return null
}

const URL_RE = /https?:\/\/[^\s\]\)]+/gi
function extractUrlsFromText(t) {
  if (!t) return []
  const seen = new Set()
  const out = []
  for (const m of String(t).matchAll(URL_RE)) {
    const url = m[0].replace(/[.,;:!?)]+$/, '')
    if (!seen.has(url)) { seen.add(url); out.push(url) }
  }
  return out
}

export function loadWorkbook(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const respName = guessSheet(wb, 'response')
  const respRows = sheetToObjects(wb.Sheets[respName], RESPONSE_ALIASES)
    .filter(r => (r.query || r.response))
    .map((r, i) => ({
      id: r.id != null ? String(r.id) : `r${i + 1}`,
      query: String(r.query || '').trim(),
      platform: String(r.platform || 'unknown').trim().toLowerCase(),
      response: String(r.response || '').trim(),
      run: r.run != null ? String(r.run) : null,
      city: r.city || null,
      state: r.state ? String(r.state).trim() : null,
      inline_urls: extractUrlsFromText(r.response),
    }))

  const citName = guessSheet(wb, 'citation')
  let citRows = []
  if (citName) {
    citRows = sheetToObjects(wb.Sheets[citName], CITATION_ALIASES)
      .filter(r => r.url)
      .map((r, i) => ({
        id: r.id != null ? String(r.id) : `c${i + 1}`,
        url: String(r.url).trim(),
        cited_by: r.cited_by != null ? String(r.cited_by) : null,
        title: r.title ? String(r.title) : null,
        snippet: r.snippet ? String(r.snippet) : null,
      }))
  }

  return {
    sheetNames: wb.SheetNames,
    responseSheet: respName,
    citationSheet: citName,
    responses: respRows,
    citations: citRows,
  }
}
