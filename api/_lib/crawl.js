// Minimal HTML fetch + text extraction and simple keyword retrieval.
// Node 18+ has global fetch.

const UA = 'Mozilla/5.0 (compatible; AIVisibilityChecker/1.0; +https://ai-visibility.local)'
const FETCH_TIMEOUT_MS = 12000
const MAX_HTML_BYTES = 800_000

async function fetchWithTimeout(url, opts = {}) {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), opts.timeout || FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, { ...opts, signal: ctl.signal, headers: { 'user-agent': UA, ...(opts.headers || {}) } })
    return res
  } finally {
    clearTimeout(t)
  }
}

async function fetchText(url) {
  try {
    const res = await fetchWithTimeout(url)
    if (!res.ok) return { ok: false, status: res.status, url, text: '' }
    const buf = await res.arrayBuffer()
    const bytes = new Uint8Array(buf).slice(0, MAX_HTML_BYTES)
    const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
    return { ok: true, status: res.status, url: res.url || url, text }
  } catch (e) {
    return { ok: false, status: 0, url, text: '', error: String(e.message || e) }
  }
}

function stripHtml(html) {
  // Remove scripts, styles, nav/footer/header for cleaner text.
  let s = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
  const titleM = s.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const title = titleM ? decodeEntities(titleM[1]).trim() : ''
  s = s.replace(/<[^>]+>/g, ' ')
  s = decodeEntities(s).replace(/\s+/g, ' ').trim()
  return { title, text: s }
}

function decodeEntities(s) {
  return s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&rsquo;/gi, "'")
    .replace(/&lsquo;/gi, "'")
    .replace(/&rdquo;/gi, '"')
    .replace(/&ldquo;/gi, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
}

function normalizeBrandUrl(input) {
  let s = String(input || '').trim()
  if (!s) return null
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s
  try {
    const u = new URL(s)
    u.hash = ''
    return u
  } catch {
    return null
  }
}

async function fetchSitemapUrls(rootUrl) {
  const found = new Set()
  const roots = [`${rootUrl.origin}/sitemap.xml`, `${rootUrl.origin}/sitemap_index.xml`]
  const robots = await fetchText(`${rootUrl.origin}/robots.txt`)
  if (robots.ok) {
    for (const m of robots.text.matchAll(/sitemap:\s*(\S+)/gi)) roots.push(m[1])
  }
  for (const sm of roots) {
    const r = await fetchText(sm)
    if (!r.ok) continue
    for (const m of r.text.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)) {
      try {
        const u = new URL(m[1])
        if (u.hostname.endsWith(rootUrl.hostname) || rootUrl.hostname.endsWith(u.hostname)) {
          found.add(u.toString())
        }
      } catch { /* skip */ }
    }
    if (found.size > 300) break
  }
  return [...found]
}

function extractSameOriginLinks(html, base) {
  const out = new Set()
  for (const m of html.matchAll(/<a\s[^>]*href=["']([^"']+)["']/gi)) {
    try {
      const u = new URL(m[1], base.href)
      if (u.hostname === base.hostname && /^https?:$/.test(u.protocol)) {
        u.hash = ''
        out.add(u.toString())
      }
    } catch { /* skip */ }
  }
  return [...out]
}

function scoreUrlForBrand(url, brand) {
  // Prefer shorter paths, product/rate/interest/deposit-ish keywords.
  const path = url.replace(brand.origin, '').toLowerCase()
  let score = -path.length * 0.02
  const KW = ['saving', 'deposit', 'rate', 'interest', 'account', 'fd', 'loan', 'card', 'nri', 'rd', 'salary', 'senior']
  for (const kw of KW) if (path.includes(kw)) score += 3
  if (path === '/' || path === '') score += 2
  return score
}

export async function crawlBrand(brandUrlStr, { maxPages = 20, emit = () => {} } = {}) {
  const brand = normalizeBrandUrl(brandUrlStr)
  if (!brand) return { error: 'invalid_brand_url', pages: [] }

  emit({ type: 'crawl', stage: 'sitemap', url: brand.origin })
  let candidates = await fetchSitemapUrls(brand)
  if (candidates.length < 5) {
    emit({ type: 'crawl', stage: 'homepage', url: brand.origin })
    const home = await fetchText(brand.origin + '/')
    if (home.ok) {
      candidates = candidates.concat(extractSameOriginLinks(home.text, brand))
    }
  }
  candidates = [...new Set(candidates)]
    .sort((a, b) => scoreUrlForBrand(b, brand) - scoreUrlForBrand(a, brand))
    .slice(0, Math.max(maxPages * 3, 40))

  // Always ensure homepage is fetched
  const homeUrl = brand.origin + '/'
  candidates = [homeUrl, ...candidates.filter(u => u !== homeUrl)].slice(0, maxPages)

  const pages = []
  let done = 0
  for (const u of candidates) {
    const r = await fetchText(u)
    done++
    if (r.ok && r.text) {
      const { title, text } = stripHtml(r.text)
      if (text.length > 200) {
        pages.push({ url: r.url, title, text: text.slice(0, 8000) })
      }
    }
    emit({ type: 'crawl', stage: 'fetched', done, total: candidates.length, url: u })
  }
  emit({ type: 'crawl', stage: 'done', pages: pages.length })
  return { brand: brand.toString(), origin: brand.origin, pages }
}

// Simple keyword-overlap retrieval so we don't need embeddings.
function tokenize(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9%.\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2)
}

const STOP = new Set(['the','and','for','with','this','that','are','from','have','has','was','were','you','your','their','they','into','not','but','all','any','can','may','use','one','two','more','less','than','also','per','pa','yr','yrs','year','years'])

export function retrieveRelevantPages(pages, queryText, k = 6) {
  if (!pages.length) return []
  const qTerms = tokenize(queryText).filter(w => !STOP.has(w))
  const qBag = new Map()
  for (const t of qTerms) qBag.set(t, (qBag.get(t) || 0) + 1)

  const scored = pages.map(p => {
    const bag = new Map()
    for (const t of tokenize(p.text).filter(w => !STOP.has(w))) {
      bag.set(t, (bag.get(t) || 0) + 1)
    }
    let s = 0
    for (const [t, w] of qBag) {
      if (bag.has(t)) s += Math.min(bag.get(t), 5) * w
    }
    // Title bonus
    for (const t of tokenize(p.title).filter(w => !STOP.has(w))) {
      if (qBag.has(t)) s += 3
    }
    return { page: p, score: s }
  })
  return scored
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map(x => x.page)
}

export async function fetchCitedUrl(url) {
  const r = await fetchText(url)
  if (!r.ok) return { url, ok: false, status: r.status, error: r.error }
  const { title, text } = stripHtml(r.text)
  return { url: r.url, ok: true, status: r.status, title, text: text.slice(0, 8000) }
}
