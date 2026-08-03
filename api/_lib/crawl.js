// URL fetch + HTML->text extraction, with in-process caching so the
// same URL is only fetched once per invocation (many responses may cite
// the same source).

const UA = 'Mozilla/5.0 (compatible; AIVisibilityChecker/1.0; +https://ai-visibility.local)'
const FETCH_TIMEOUT_MS = 12000
const MAX_HTML_BYTES = 900_000
const MAX_EXTRACT_CHARS = 8000

const cache = new Map() // url -> Promise<result>

async function fetchWithTimeout(url, opts = {}) {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), opts.timeout || FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, { ...opts, signal: ctl.signal, headers: { 'user-agent': UA, ...(opts.headers || {}) } })
  } finally {
    clearTimeout(t)
  }
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
  try {
    const u = new URL(s)
    u.hash = ''
    return u
  } catch { return null }
}

function baseDomain(host) {
  // crude eTLD+1 for common suffixes (.com, .co.in, .in, .org, ...)
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

export function fetchCitedUrl(url) {
  if (cache.has(url)) return cache.get(url)
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
  cache.set(url, p)
  return p
}

export function resetFetchCache() { cache.clear() }
