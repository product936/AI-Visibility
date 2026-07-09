import formidable from 'formidable'
import fs from 'node:fs/promises'
import { loadWorkbook } from './_lib/excel.js'
import { crawlBrand, retrieveRelevantPages, fetchCitedUrl } from './_lib/crawl.js'
import { judgeResponse, judgeCitedUrl } from './_lib/judge.js'

export const config = {
  api: { bodyParser: false },
  maxDuration: 300,
}

const MAX_RESPONSES = Number(process.env.CHECKER_MAX_RESPONSES || 60)
const MAX_BRAND_PAGES = Number(process.env.CHECKER_MAX_BRAND_PAGES || 18)
const MAX_UNIQUE_CITATIONS = Number(process.env.CHECKER_MAX_UNIQUE_CITATIONS || 40)

function sseWriter(res) {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders?.()
  const send = (obj) => {
    res.write(`data: ${JSON.stringify(obj)}\n\n`)
    // @ts-ignore - flush exists on Node http response with some setups
    if (typeof res.flush === 'function') try { res.flush() } catch { /* ignore */ }
  }
  return send
}

async function parseMultipart(req) {
  const form = formidable({ multiples: false, maxFileSize: 20 * 1024 * 1024 })
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err)
      const flat = {}
      for (const [k, v] of Object.entries(fields)) flat[k] = Array.isArray(v) ? v[0] : v
      const file = files.file ? (Array.isArray(files.file) ? files.file[0] : files.file) : null
      resolve({ fields: flat, file })
    })
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405
    res.setHeader('Allow', 'POST')
    return res.end(JSON.stringify({ error: 'method_not_allowed' }))
  }

  const send = sseWriter(res)
  const startedAt = new Date().toISOString()

  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      send({ type: 'error', error: 'ANTHROPIC_API_KEY is not set on the server. Add it in your environment or Vercel project settings.' })
      return res.end()
    }

    send({ type: 'log', message: 'Parsing upload…' })
    const { fields, file } = await parseMultipart(req)
    const brandName = String(fields.brandName || '').trim() || 'Brand'
    const brandUrl = String(fields.brandUrl || '').trim()
    if (!file) throw new Error('Excel file is required (field name: file).')
    if (!brandUrl) throw new Error('Brand URL is required.')

    const buffer = await fs.readFile(file.filepath)
    const wb = loadWorkbook(buffer)
    if (!wb.responses.length) throw new Error('No response rows detected. Expected columns like: question_text, platform, ai_response.')

    send({
      type: 'loaded',
      brandName,
      brandUrl,
      sheets: wb.sheetNames,
      responseSheet: wb.responseSheet,
      citationSheet: wb.citationSheet,
      responseCount: wb.responses.length,
      citationCount: wb.citations.length,
    })

    // Crawl brand site
    send({ type: 'log', message: `Crawling ${brandUrl} (up to ${MAX_BRAND_PAGES} pages)…` })
    const crawl = await crawlBrand(brandUrl, { maxPages: MAX_BRAND_PAGES, emit: send })
    if (!crawl.pages.length) {
      send({ type: 'error', error: `Could not crawl any pages from ${brandUrl}. Check the URL.` })
      return res.end()
    }
    send({ type: 'log', message: `Fetched ${crawl.pages.length} brand pages.` })

    // Cap responses
    const responses = wb.responses.slice(0, MAX_RESPONSES)
    const droppedResponses = wb.responses.length - responses.length
    if (droppedResponses > 0) {
      send({ type: 'log', message: `Only judging first ${responses.length} of ${wb.responses.length} responses (limit ${MAX_RESPONSES}).` })
    }

    // Judge each response
    const responseResults = []
    for (let i = 0; i < responses.length; i++) {
      const r = responses[i]
      send({ type: 'response_start', index: i, total: responses.length, id: r.id, platform: r.platform, city: r.city })
      const pages = retrieveRelevantPages(crawl.pages, `${r.query} ${r.response}`, 6)
      const usedPages = pages.length ? pages : crawl.pages.slice(0, 4)
      const verdict = await judgeResponse({
        brandName,
        brandOrigin: crawl.origin,
        query: r.query,
        platform: r.platform,
        response: r.response,
        pages: usedPages,
      })
      const row = {
        id: r.id,
        query: r.query,
        platform: r.platform,
        city: r.city,
        state: r.state,
        run: r.run,
        response: r.response,
        verdict: verdict.verdict,
        confidence: verdict.confidence ?? null,
        summary: verdict.summary || '',
        claims: verdict.claims || [],
        sources_considered: usedPages.map(p => ({ url: p.url, title: p.title })),
      }
      responseResults.push(row)
      send({ type: 'response_done', index: i, total: responses.length, row })
    }

    // Cited URLs
    let citationResults = []
    // Union of Sheet-2 citations and inline URLs found in responses
    const citationMap = new Map()
    for (const c of wb.citations) {
      if (!citationMap.has(c.url)) citationMap.set(c.url, { url: c.url, cited_by: new Set() })
      if (c.cited_by) citationMap.get(c.url).cited_by.add(c.cited_by)
    }
    for (const r of responses) {
      for (const u of r.inline_urls) {
        if (!citationMap.has(u)) citationMap.set(u, { url: u, cited_by: new Set() })
        citationMap.get(u).cited_by.add(r.id)
      }
    }
    const citationList = [...citationMap.values()].slice(0, MAX_UNIQUE_CITATIONS)
    if (citationList.length) {
      send({ type: 'log', message: `Checking ${citationList.length} cited URLs…` })
      for (let i = 0; i < citationList.length; i++) {
        const c = citationList[i]
        send({ type: 'citation_start', index: i, total: citationList.length, url: c.url })
        const fetched = await fetchCitedUrl(c.url)
        if (!fetched.ok) {
          const row = {
            url: c.url,
            cited_by: [...c.cited_by],
            verdict: 'unreachable',
            summary: `Fetch failed (${fetched.status || 'error'}${fetched.error ? ': ' + fetched.error : ''})`,
            issues: [],
            title: null,
          }
          citationResults.push(row)
          send({ type: 'citation_done', index: i, total: citationList.length, row })
          continue
        }
        const sampleResp = responseResults.find(rr => c.cited_by.has(rr.id)) || responseResults[0]
        const brandPages = retrieveRelevantPages(crawl.pages, `${sampleResp?.query || ''} ${fetched.text.slice(0, 500)}`, 4)
        const verdict = await judgeCitedUrl({
          brandName,
          brandOrigin: crawl.origin,
          response: sampleResp?.response || '',
          url: c.url,
          urlContent: `${fetched.title}\n${fetched.text}`,
          brandPages,
        })
        const row = {
          url: fetched.url,
          title: fetched.title,
          cited_by: [...c.cited_by],
          verdict: verdict.verdict,
          summary: verdict.summary || '',
          issues: verdict.issues || [],
        }
        citationResults.push(row)
        send({ type: 'citation_done', index: i, total: citationList.length, row })
      }
    } else {
      send({ type: 'log', message: 'No citation sheet and no inline URLs in responses — skipping cited-URL checks.' })
    }

    const finishedAt = new Date().toISOString()
    const kpis = summarizeKpis(responseResults, citationResults)
    const result = {
      generated_at: finishedAt,
      started_at: startedAt,
      brand_name: brandName,
      brand_url: brandUrl,
      brand_origin: crawl.origin,
      sheets: wb.sheetNames,
      response_sheet: wb.responseSheet,
      citation_sheet: wb.citationSheet,
      brand_pages: crawl.pages.map(p => ({ url: p.url, title: p.title })),
      responses: responseResults,
      cited_urls: citationResults,
      dropped_responses: droppedResponses,
      kpis,
    }
    send({ type: 'done', result })
    res.end()
  } catch (e) {
    send({ type: 'error', error: String(e?.message || e) })
    res.end()
  }
}

function summarizeKpis(responses, citations) {
  const byPlatform = {}
  for (const r of responses) {
    const p = r.platform || 'unknown'
    byPlatform[p] = byPlatform[p] || { total: 0, correct: 0, partially_incorrect: 0, incorrect: 0, unverifiable: 0 }
    byPlatform[p].total += 1
    byPlatform[p][r.verdict] = (byPlatform[p][r.verdict] || 0) + 1
  }
  const total = responses.length
  const overall = responses.reduce((acc, r) => {
    acc[r.verdict] = (acc[r.verdict] || 0) + 1
    return acc
  }, { correct: 0, partially_incorrect: 0, incorrect: 0, unverifiable: 0 })
  const citationsSummary = citations.reduce((acc, c) => {
    acc[c.verdict] = (acc[c.verdict] || 0) + 1
    return acc
  }, { reliable: 0, partially_unreliable: 0, unreliable: 0, unreachable: 0 })
  return {
    total_responses: total,
    overall_verdicts: overall,
    accuracy_pct: total ? Math.round((overall.correct / total) * 100) : 0,
    by_platform: byPlatform,
    total_citations: citations.length,
    citation_verdicts: citationsSummary,
  }
}
