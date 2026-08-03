import * as XLSX from 'xlsx'

// Column-alias detection so the checker tolerates minor header variation.
const MENTION_ALIASES = {
  response_id: ['response_id', 'id', 'row_id', 'sn'],
  master_outlet_id: ['master_outlet_id', 'outlet_id', 'outletid'],
  query: ['question_text', 'question', 'query', 'prompt', 'prompt_text'],
  platform: ['platform', 'model', 'llm', 'engine'],
  response: ['ai_response', 'response', 'answer', 'output'],
  product: ['product', 'sku'],
  product_category: ['product_category', 'category', 'category_type'],
  discoverability_status: ['discoverability_status', 'discoverability', 'mention_status'],
  product_mentioned: ['product_mentioned', 'mentioned'],
  competitor_mentioned: ['competitor_mentioned', 'competitors'],
  city: ['city'],
  state: ['state'],
  run: ['run', 'run_idx', 'run_no', 'iteration'],
}

const CITATION_ALIASES = {
  response_id: ['response_id', 'id'],
  master_outlet_id: ['master_outlet_id', 'outlet_id', 'outletid'],
  url: ['url', 'citation_url', 'link', 'source_url'],
  source: ['source', 'source_domain', 'domain'],
  platform: ['platform', 'model', 'llm', 'engine'],
  category: ['category', 'source_category'],
  ownership: ['ownership', 'owner_type', 'source_ownership'],
  cited_you: ['cited_you', 'cites_brand', 'brand_mentioned'],
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

function firstSheet(wb) {
  return wb.SheetNames[0]
}

function sheetToObjects(ws, aliases) {
  if (!ws) return { headers: [], rows: [], mapped: {} }
  const rows = XLSX.utils.sheet_to_json(ws, { defval: null, raw: false })
  if (!rows.length) return { headers: [], rows: [], mapped: {} }
  const headers = Object.keys(rows[0])
  const mapped = {}
  for (const h of headers) {
    const canon = matchKey(h, aliases)
    if (canon) mapped[h] = canon
  }
  const out = rows.map((r, i) => {
    const row = { _rowIdx: i + 2 }
    for (const h of headers) {
      const canon = mapped[h]
      if (canon) row[canon] = r[h]
    }
    return row
  })
  return { headers, rows: out, mapped }
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

function pk(outlet, resp) {
  return `${outlet ?? ''}::${resp ?? ''}`
}

function s(v) {
  return v == null ? null : String(v).trim() || null
}

export function loadMentions(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const name = firstSheet(wb)
  const { rows, headers } = sheetToObjects(wb.Sheets[name], MENTION_ALIASES)
  const out = rows
    .filter(r => r.query || r.response)
    .map((r, i) => {
      const outlet = s(r.master_outlet_id)
      const respId = s(r.response_id) || `m${i + 1}`
      return {
        pk: pk(outlet, respId),
        master_outlet_id: outlet,
        response_id: respId,
        query: String(r.query || '').trim(),
        platform: String(r.platform || 'unknown').trim().toLowerCase(),
        response: String(r.response || '').trim(),
        product: s(r.product),
        product_category: s(r.product_category),
        discoverability_status: s(r.discoverability_status),
        product_mentioned: r.product_mentioned == null ? null : String(r.product_mentioned).trim(),
        competitor_mentioned: r.competitor_mentioned
          ? String(r.competitor_mentioned).split(/[,;|]/).map(x => x.trim()).filter(Boolean)
          : [],
        city: s(r.city),
        state: s(r.state),
        run: r.run != null ? String(r.run) : null,
        inline_urls: extractUrlsFromText(r.response),
      }
    })
  return {
    sheet: name,
    sheetNames: wb.SheetNames,
    detectedColumns: headers,
    rows: out,
  }
}

export function loadCitations(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const name = firstSheet(wb)
  const { rows, headers } = sheetToObjects(wb.Sheets[name], CITATION_ALIASES)
  const out = rows
    .filter(r => r.url)
    .map((r, i) => {
      const outlet = s(r.master_outlet_id)
      const respId = s(r.response_id)
      return {
        _idx: i + 1,
        pk: pk(outlet, respId),
        master_outlet_id: outlet,
        response_id: respId,
        platform: s(r.platform)?.toLowerCase() || null,
        source: s(r.source),
        url: String(r.url).trim(),
        category: s(r.category),
        ownership: s(r.ownership),
        cited_you: r.cited_you == null ? null : String(r.cited_you).trim().toLowerCase(),
        title: s(r.title),
        snippet: s(r.snippet),
      }
    })
  return {
    sheet: name,
    sheetNames: wb.SheetNames,
    detectedColumns: headers,
    rows: out,
  }
}
