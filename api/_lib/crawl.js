// URL fetch + HTML->text extraction + brand-site search fallback.
// Fetches and the brand corpus are cached in-process.

const UA = 'Mozilla/5.0 (compatible; AIVisibilityChecker/1.0; +https://ai-visibility.local)'
const FETCH_TIMEOUT_MS = 12000
const MAX_HTML_BYTES = 900_000
const MAX_EXTRACT_CHARS = 8000

const fetchCache = new Map() // url -> Promise<{ok, text, title, url, status}>
const brandCorpusCache = new Map() // origin -> Promise<Array<{url, path}>>

async function fetchWithTimeout(url, opts = {}) {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), opts.timeout || FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, { ...opts, signal: ctl.signal, headers: { 'user-agent': UA, ...(opts.headers || {}) } })
  } finally { clearTimeout(t) }
}

function decodeEntities(s) {
  return s
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/&rsquo;/gi, "'").replace(/&lsquo;/gi, "'")
    .replace(/&rdquo;/gi, '"').replace(/&ldquo;/gi, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
}

function stripHtml(html) {
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

export function normalizeBrandUrl(input) {
  let s = String(input || '').trim()
  if (!s) return null
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s
  try { const u = new URL(s); u.hash = ''; return u } catch { return null }
}

function baseDomain(host) {
  const parts = host.toLowerCase().split('.')
  if (parts.length <= 2) return host.toLowerCase()
  const lastTwo = parts.slice(-2).join('.')
  const lastThree = parts.slice(-3).join('.')
  if (/^(co|com|net|org|gov|ac|edu)\.[a-z]{2}$/.test(lastTwo)) return lastThree
  return lastTwo
}

export function isBrandUrl(url, brandOrigin, ownership) {
  if (ownership && String(ownership).trim().toLowerCase() === 'owned') return true
  try {
    const u = new URL(url)
    const b = new URL(brandOrigin)
    return baseDomain(u.hostname) === baseDomain(b.hostname)
  } catch { return false }
}

export function fetchUrl(url) {
  if (fetchCache.has(url)) return fetchCache.get(url)
  const p = (async () => {
    try {
      const res = await fetchWithTimeout(url)
      if (!res.ok) return { url, ok: false, status: res.status, title: null, text: '' }
      const buf = await res.arrayBuffer()
      const bytes = new Uint8Array(buf).slice(0, MAX_HTML_BYTES)
      const html = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
      const { title, text } = stripHtml(html)
      return { url: res.url || url, ok: true, status: res.status, title, text: text.slice(0, MAX_EXTRACT_CHARS) }
    } catch (e) {
      return { url, ok: false, status: 0, title: null, text: '', error: String(e.message || e) }
    }
  })()
  fetchCache.set(url, p)
  return p
}

export function resetCaches() { fetchCache.clear(); brandCorpusCache.clear() }

// ---- Brand-site discovery ----
async function fetchSitemapUrls(origin) {
  const roots = [`${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`]
  const robots = await fetchUrl(`${origin}/robots.txt`)
  if (robots.ok) {
    for (const m of robots.text.matchAll(/sitemap:\s*(\S+)/gi)) roots.push(m[1])
  }
  const found = new Set()
  const originHost = new URL(origin).hostname
  const seen = new Set()
  const queue = [...roots]
  while (queue.length && found.size < 3000) {
    const sm = queue.shift()
    if (seen.has(sm)) continue
    seen.add(sm)
    const r = await fetchUrl(sm)
    if (!r.ok) continue
    // Detect sitemap-index
    for (const m of r.text.matchAll(/<sitemap>[\s\S]*?<loc>\s*([^<\s]+)\s*<\/loc>/gi)) {
      queue.push(m[1])
    }
    for (const m of r.text.matchAll(/<url>[\s\S]*?<loc>\s*([^<\s]+)\s*<\/loc>/gi)) {
      try {
        const u = new URL(m[1])
        if (u.hostname === originHost || u.hostname.endsWith('.' + baseDomain(originHost))) {
          u.hash = ''
          found.add(u.toString())
        }
      } catch { /* skip */ }
    }
    // Fallback pattern for older sitemaps without <url> wrapper
    if (!found.size) {
      for (const m of r.text.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)) {
        try {
          const u = new URL(m[1])
          if (u.hostname === originHost || u.hostname.endsWith('.' + baseDomain(originHost))) {
            found.add(u.toString())
          }
        } catch { /* skip */ }
      }
    }
  }
  return [...found]
}

async function fetchHomepageLinks(origin) {
  const r = await fetchUrl(origin + '/')
  if (!r.ok) return []
  const out = new Set()
  const originHost = new URL(origin).hostname
  for (const m of r.text.matchAll(/href=["']([^"']+)["']/gi)) {
    try {
      const u = new URL(m[1], origin + '/')
      if (u.hostname === originHost && /^https?:$/.test(u.protocol)) {
        u.hash = ''
        out.add(u.toString())
      }
    } catch { /* skip */ }
  }
  return [...out]
}

export async function discoverBrandCorpus(brandOrigin) {
  if (brandCorpusCache.has(brandOrigin)) return brandCorpusCache.get(brandOrigin)
  const p = (async () => {
    let urls = await fetchSitemapUrls(brandOrigin)
    if (urls.length < 5) {
      urls = [...new Set([...urls, ...(await fetchHomepageLinks(brandOrigin))])]
    }
    return urls.map(u => {
      try {
        const parsed = new URL(u)
        return { url: u, path: parsed.pathname }
      } catch { return null }
    }).filter(Boolean)
  })()
  brandCorpusCache.set(brandOrigin, p)
  return p
}

// ---- Keyword retrieval ----
const STOP = new Set([
  'the','and','for','with','this','that','are','from','have','has','was','were','you','your','their','they','into','not','but','all','any','can','may','use','one','two','more','less','than','also','per','pa','yr','yrs','year','years','which','what','when','where','how','who','why','best','top','india','indian','a','an','of','in','on','to','as','is','be','it','or'
])

function tokenize(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOP.has(w))
}

function scoreUrlByKeywords(url, path, tokens) {
  const target = tokenize((path || '').replace(/-/g, ' ')).concat(tokenize(url))
  const bag = new Map()
  for (const t of target) bag.set(t, (bag.get(t) || 0) + 1)
  let s = 0
  for (const t of tokens) if (bag.has(t)) s += 1
  // Small penalty for very long paths (usually deep, less-relevant pages)
  s -= Math.max(0, (path?.split('/').filter(Boolean).length || 0) - 3) * 0.1
  return s
}

function scoreContentByKeywords(text, tokens) {
  const bag = new Map()
  for (const t of tokenize(text)) bag.set(t, (bag.get(t) || 0) + 1)
  let s = 0
  for (const t of tokens) if (bag.has(t)) s += Math.min(bag.get(t), 5)
  return s
}

export async function searchBrandForResponse({ brandOrigin, response, minPathScore = 1, minContentScore = 3, urlCandidates = 8, keep = 3 }) {
  const corpus = await discoverBrandCorpus(brandOrigin)
  if (!corpus.length) return { pages: [], corpus_size: 0 }

  const tokens = tokenize(`${response.query || ''} ${response.product || ''} ${response.product_category || ''}`)
  if (!tokens.length) return { pages: [], corpus_size: corpus.length }

  const ranked = corpus
    .map(c => ({ ...c, score: scoreUrlByKeywords(c.url, c.path, tokens) }))
    .filter(x => x.score >= minPathScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, urlCandidates)

  // Always try the homepage as one candidate if we're short
  const home = brandOrigin + '/'
  if (!ranked.some(x => x.url === home)) ranked.push({ url: home, path: '/', score: 0 })

  const fetched = await Promise.all(ranked.map(r => fetchUrl(r.url).then(f => ({ ...r, ...f }))))
  const scored = fetched
    .filter(f => f.ok && f.text)
    .map(f => ({ ...f, contentScore: scoreContentByKeywords(`${f.title}\n${f.text}`, tokens) }))
    .filter(f => f.contentScore >= minContentScore)
    .sort((a, b) => b.contentScore - a.contentScore)
    .slice(0, keep)
  return { pages: scored.map(f => ({ url: f.url, title: f.title, text: f.text })), corpus_size: corpus.length }
}
