import formidable from 'formidable'
import fs from 'node:fs/promises'
import { loadMentions, loadCitations } from './_lib/excel.js'
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
    if (typeof res.flush === 'function') try { res.flush() } catch { /* ignore */ }
  }
  return send
}

async function parseMultipart(req) {
  const form = formidable({ multiples: true, maxFileSize: 25 * 1024 * 1024 })
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err)
      const flat = {}
      for (const [k, v] of Object.entries(fields)) flat[k] = Array.isArray(v) ? v[0] : v
      const pick = k => {
        const f = files[k]
        if (!f) return null
        return Array.isArray(f) ? f[0] : f
      }
      resolve({
        fields: flat,
        mentionsFile: pick('mentionsFile'),
        citationsFile: pick('citationsFile'),
      })
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

    send({ type: 'log', message: 'Parsing uploads…' })
    const { fields, mentionsFile, citationsFile } = await parseMultipart(req)
    const brandName = String(fields.brandName || '').trim() || 'Brand'
    const brandUrl = String(fields.brandUrl || '').trim()
    if (!mentionsFile) throw new Error('Mentions Excel file is required (field: mentionsFile).')
    if (!brandUrl) throw new Error('Brand URL is required.')

    const mentionsBuf = await fs.readFile(mentionsFile.filepath)
    const mentions = loadMentions(mentionsBuf)
    if (!mentions.rows.length) throw new Error('No response rows detected in mentions file. Expected columns include: question_text, platform, ai_response, master_outlet_id, id.')

    let citations = { rows: [], sheetNames: [], detectedColumns: [], sheet: null }
    if (citationsFile) {
      const citationsBuf = await fs.readFile(citationsFile.filepath)
      citations = loadCitations(citationsBuf)
    }

    // Join citations to mentions on composite key (master_outlet_id, response_id).
    const mentionByPk = new Map(mentions.rows.map(m => [m.pk, m]))
    const orphanCitations = citations.rows.filter(c => !mentionByPk.has(c.pk)).length

    send({
      type: 'loaded',
      brandName,
      brandUrl,
      mentions: {
        sheet: mentions.sheet,
        columns: mentions.detectedColumns,
        count: mentions.rows.length,
      },
      citations: {
        sheet: citations.sheet,
        columns: citations.detectedColumns,
        count: citations.rows.length,
        orphan: orphanCitations,
      },
    })

    // Crawl brand site
    send({ type: 'log', message: `Crawling ${brandUrl} (up to ${MAX_BRAND_PAGES} pages)…` })
    const crawl = await crawlBrand(brandUrl, { maxPages: MAX_BRAND_PAGES, emit: send })
    if (!crawl.pages.length) {
      send({ type: 'error', error: `Could not crawl any pages from ${brandUrl}. Check the URL is reachable and returns HTML.` })
      return res.end()
    }
    send({ type: 'log', message: `Fetched ${crawl.pages.length} brand pages.` })

    // Cap responses
    const responses = mentions.rows.slice(0, MAX_RESPONSES)
    const droppedResponses = mentions.rows.length - responses.length
    if (droppedResponses > 0) {
      send({ type: 'log', message: `Judging first ${responses.length} of ${mentions.rows.length} responses (limit ${MAX_RESPONSES}).` })
    }

    // Judge each response
    const responseResults = []
    const includedResponsePks = new Set()
    for (let i = 0; i < responses.length; i++) {
      const r = responses[i]
      includedResponsePks.add(r.pk)
      send({ type: 'response_start', index: i, total: responses.length, pk: r.pk, platform: r.platform, product: r.product })
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
        pk: r.pk,
        master_outlet_id: r.master_outlet_id,
        response_id: r.response_id,
        query: r.query,
        platform: r.platform,
        product: r.product,
        product_category: r.product_category,
        discoverability_status: r.discoverability_status,
        product_mentioned: r.product_mentioned,
        competitor_mentioned: r.competitor_mentioned,
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

    // Cited URLs: from citations file + inline URLs found in included responses
    const citationMap = new Map() // url -> {url, cited_by:Set<pk>, sources:Set<string>, cited_you:string|null}
    const addCitation = (url, opts = {}) => {
      if (!url) return
      if (!citationMap.has(url)) {
        citationMap.set(url, { url, cited_by: new Set(), sources: new Set(), cited_you: opts.cited_you || null, category: opts.category || null, ownership: opts.ownership || null })
      }
      const rec = citationMap.get(url)
      if (opts.by) rec.cited_by.add(opts.by)
      if (opts.source) rec.sources.add(opts.source)
      if (opts.cited_you && !rec.cited_you) rec.cited_you = opts.cited_you
      if (opts.category && !rec.category) rec.category = opts.category
      if (opts.ownership && !rec.ownership) rec.ownership = opts.ownership
    }
    for (const c of citations.rows) {
      if (!includedResponsePks.has(c.pk)) continue
      addCitation(c.url, { by: c.pk, source: c.source, cited_you: c.cited_you, category: c.category, ownership: c.ownership })
    }
    for (const r of responses) {
      for (const u of r.inline_urls) addCitation(u, { by: r.pk })
    }
    const citationList = [...citationMap.values()].slice(0, MAX_UNIQUE_CITATIONS)
    const droppedCitations = citationMap.size - citationList.length

    const citationResults = []
    if (citationList.length) {
      send({ type: 'log', message: `Checking ${citationList.length} unique cited URLs${droppedCitations ? ` (limit ${MAX_UNIQUE_CITATIONS}; ${droppedCitations} skipped)` : ''}…` })
      for (let i = 0; i < citationList.length; i++) {
        const c = citationList[i]
        send({ type: 'citation_start', index: i, total: citationList.length, url: c.url })
        const fetched = await fetchCitedUrl(c.url)
        if (!fetched.ok) {
          const row = {
            url: c.url,
            title: null,
            source: [...c.sources][0] || null,
            category: c.category,
            ownership: c.ownership,
            cited_you: c.cited_you,
            cited_by: [...c.cited_by],
            verdict: 'unreachable',
            summary: `Fetch failed (${fetched.status || 'error'}${fetched.error ? ': ' + fetched.error : ''})`,
            issues: [],
          }
          citationResults.push(row)
          send({ type: 'citation_done', index: i, total: citationList.length, row })
          continue
        }
        const sampleResp = responseResults.find(rr => c.cited_by.has(rr.pk)) || responseResults[0]
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
          source: [...c.sources][0] || null,
          category: c.category,
          ownership: c.ownership,
          cited_you: c.cited_you,
          cited_by: [...c.cited_by],
          verdict: verdict.verdict,
          summary: verdict.summary || '',
          issues: verdict.issues || [],
        }
        citationResults.push(row)
        send({ type: 'citation_done', index: i, total: citationList.length, row })
      }
    } else {
      send({ type: 'log', message: 'No citations file provided and no inline URLs found — skipping cited-URL checks.' })
    }

    const finishedAt = new Date().toISOString()
    const kpis = summarizeKpis(responseResults, citationResults)
    const result = {
      generated_at: finishedAt,
      started_at: startedAt,
      brand_name: brandName,
      brand_url: brandUrl,
      brand_origin: crawl.origin,
      mentions_sheet: mentions.sheet,
      citations_sheet: citations.sheet,
      brand_pages: crawl.pages.map(p => ({ url: p.url, title: p.title })),
      responses: responseResults,
      cited_urls: citationResults,
      dropped_responses: droppedResponses,
      dropped_citations: droppedCitations,
      orphan_citations: orphanCitations,
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
