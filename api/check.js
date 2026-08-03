import formidable from 'formidable'
import fs from 'node:fs/promises'
import pLimit from 'p-limit'
import { loadMentions, loadCitations } from './_lib/excel.js'
import { fetchCitedUrl, isBrandUrl, normalizeBrandUrl, resetFetchCache } from './_lib/crawl.js'
import { analyzeResponse } from './_lib/judge.js'

export const config = {
  api: { bodyParser: false },
  maxDuration: 300,
}

const MAX_RESPONSES = Number(process.env.CHECKER_MAX_RESPONSES || 200)
const MAX_URLS_PER_RESPONSE = Number(process.env.CHECKER_MAX_URLS_PER_RESPONSE || 8)
const FETCH_CONCURRENCY = Number(process.env.CHECKER_FETCH_CONCURRENCY || 8)
const JUDGE_CONCURRENCY = Number(process.env.CHECKER_JUDGE_CONCURRENCY || 4)

function sseWriter(res) {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders?.()
  return (obj) => {
    res.write(`data: ${JSON.stringify(obj)}\n\n`)
    if (typeof res.flush === 'function') try { res.flush() } catch { /* ignore */ }
  }
}

async function parseMultipart(req) {
  const form = formidable({ multiples: true, maxFileSize: 25 * 1024 * 1024 })
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err)
      const flat = {}
      for (const [k, v] of Object.entries(fields)) flat[k] = Array.isArray(v) ? v[0] : v
      const pick = k => (files[k] ? (Array.isArray(files[k]) ? files[k][0] : files[k]) : null)
      resolve({ fields: flat, mentionsFile: pick('mentionsFile'), citationsFile: pick('citationsFile') })
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
  resetFetchCache()

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
    if (!citationsFile) throw new Error('Citations Excel file is required for the new per-response analysis (field: citationsFile).')
    if (!brandUrl) throw new Error('Brand URL is required to classify brand vs third-party citations.')

    const brandNormalized = normalizeBrandUrl(brandUrl)
    if (!brandNormalized) throw new Error(`Brand URL "${brandUrl}" is not a valid URL.`)

    const mentions = loadMentions(await fs.readFile(mentionsFile.filepath))
    const citations = loadCitations(await fs.readFile(citationsFile.filepath))
    if (!mentions.rows.length) throw new Error('No response rows detected in mentions file.')
    if (!citations.rows.length) throw new Error('No citation rows detected in citations file.')

    // Bucket citations by (master_outlet_id, response_id) into brand vs 3rd party.
    const buckets = new Map()
    for (const c of citations.rows) {
      if (!buckets.has(c.pk)) buckets.set(c.pk, { brand: [], thirdParty: [] })
      const bucket = isBrandUrl(c.url, brandNormalized.origin, c.ownership) ? 'brand' : 'thirdParty'
      buckets.get(c.pk)[bucket].push(c)
    }

    // Classify each mention row.
    const responsesAll = mentions.rows.map(m => {
      const b = buckets.get(m.pk) || { brand: [], thirdParty: [] }
      return {
        ...m,
        brand_citations: b.brand,
        third_party_citations: b.thirdParty,
        has_brand_citation: b.brand.length > 0,
      }
    })

    const eligibleAll = responsesAll.filter(r => r.has_brand_citation)
    const skippedResponses = responsesAll.filter(r => !r.has_brand_citation)
    const eligible = eligibleAll.slice(0, MAX_RESPONSES)
    const droppedResponses = eligibleAll.length - eligible.length

    send({
      type: 'loaded',
      brandName,
      brandUrl,
      brand_origin: brandNormalized.origin,
      mentions: { sheet: mentions.sheet, count: mentions.rows.length },
      citations: { sheet: citations.sheet, count: citations.rows.length },
      eligible_response_count: eligibleAll.length,
      skipped_no_brand_citation: skippedResponses.length,
      will_judge: eligible.length,
    })

    // Emit skipped rows so the UI can list them.
    for (const s of skippedResponses) {
      send({
        type: 'response_skipped',
        row: {
          pk: s.pk,
          master_outlet_id: s.master_outlet_id,
          response_id: s.response_id,
          platform: s.platform,
          product: s.product,
          query: s.query,
          third_party_count: s.third_party_citations.length,
          reason: 'no_brand_citation',
        },
      })
    }

    if (droppedResponses > 0) {
      send({ type: 'log', message: `Judging first ${eligible.length} of ${eligibleAll.length} eligible responses (limit ${MAX_RESPONSES}).` })
    }

    // Prefetch all URLs (brand + 3rd party) that will be needed, deduped by cache.
    const allUrls = new Set()
    for (const r of eligible) {
      for (const c of r.brand_citations) allUrls.add(c.url)
      for (const c of r.third_party_citations.slice(0, MAX_URLS_PER_RESPONSE)) allUrls.add(c.url)
    }
    send({ type: 'log', message: `Fetching ${allUrls.size} unique cited URLs (concurrency ${FETCH_CONCURRENCY})…` })
    const fetchLimit = pLimit(FETCH_CONCURRENCY)
    let fetched = 0
    const total = allUrls.size
    send({ type: 'fetch_progress', done: 0, total })
    await Promise.all([...allUrls].map(u => fetchLimit(async () => {
      await fetchCitedUrl(u)
      fetched++
      if (fetched % 5 === 0 || fetched === total) send({ type: 'fetch_progress', done: fetched, total })
    })))
    send({ type: 'fetch_progress', done: total, total })

    // Judge each eligible response in parallel (bounded).
    const responseResults = []
    const citationResults = []
    const citationSeen = new Set()
    const judgeLimit = pLimit(JUDGE_CONCURRENCY)
    let judged = 0

    await Promise.all(eligible.map((r, index) => judgeLimit(async () => {
      send({ type: 'response_start', index, total: eligible.length, pk: r.pk, platform: r.platform, product: r.product })

      const brandFetched = await Promise.all(r.brand_citations.map(c => fetchCitedUrl(c.url)))
      const brandPages = brandFetched
        .filter(f => f.ok && f.text)
        .map((f, i) => ({ url: f.url, title: f.title, text: f.text, source: r.brand_citations[i]?.source }))

      const tpSlice = r.third_party_citations.slice(0, MAX_URLS_PER_RESPONSE)
      const tpFetched = await Promise.all(tpSlice.map(c => fetchCitedUrl(c.url)))
      const tpPages = tpFetched.map((f, i) => ({
        url: f.url || tpSlice[i].url,
        title: f.title,
        text: f.text || '',
        ok: f.ok,
        error: f.error,
        source: tpSlice[i].source,
        category: tpSlice[i].category,
        ownership: tpSlice[i].ownership,
        cited_you: tpSlice[i].cited_you,
      }))

      // If none of the brand URLs actually returned content, we can't verify.
      if (!brandPages.length) {
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
          verdict: 'unverifiable',
          summary: 'All cited brand URLs failed to fetch.',
          claims: [],
          brand_sources: r.brand_citations.map(c => ({ url: c.url, source: c.source, fetched: false })),
          third_party_urls: tpPages.map(p => ({ url: p.url, source: p.source, category: p.category, ownership: p.ownership, cited_you: p.cited_you })),
        }
        responseResults.push(row)
        judged++
        send({ type: 'response_done', index, total: eligible.length, row, done: judged })
        return
      }

      const usableTpPages = tpPages.filter(p => p.ok && p.text)
      const analysis = await analyzeResponse({
        brandName,
        brandOrigin: brandNormalized.origin,
        query: r.query,
        platform: r.platform,
        response: r.response,
        brandPages,
        thirdPartyPages: usableTpPages,
      })

      const rv = analysis.response_verdict || {}
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
        verdict: rv.verdict || 'unverifiable',
        summary: rv.summary || '',
        claims: rv.claims || [],
        brand_sources: brandPages.map(p => ({ url: p.url, title: p.title, source: p.source })),
        third_party_urls: tpPages.map(p => ({ url: p.url, source: p.source, category: p.category, ownership: p.ownership, cited_you: p.cited_you })),
      }
      responseResults.push(row)
      judged++
      send({ type: 'response_done', index, total: eligible.length, row, done: judged })

      // Emit third-party verdicts as citation events.
      const tpVerdictByUrl = new Map()
      for (const v of analysis.third_party_verdicts || []) tpVerdictByUrl.set(v.url, v)

      for (const p of tpPages) {
        // Dedupe across responses — first sighting wins.
        if (citationSeen.has(p.url)) continue
        citationSeen.add(p.url)

        let vObj
        if (!p.ok) {
          vObj = { verdict: 'unreachable', summary: `Fetch failed${p.error ? ': ' + p.error : ''}`, issues: [] }
        } else {
          vObj = tpVerdictByUrl.get(p.url) || { verdict: 'unverifiable', summary: 'Judge did not return a verdict for this URL.', issues: [] }
        }
        const cRow = {
          url: p.url,
          title: p.title,
          source: p.source,
          category: p.category,
          ownership: p.ownership,
          cited_you: p.cited_you,
          cited_by: [r.pk],
          verdict: vObj.verdict,
          summary: vObj.summary,
          issues: vObj.issues || [],
        }
        citationResults.push(cRow)
        send({ type: 'citation_done', row: cRow, done: citationResults.length })
      }
    })))

    const finishedAt = new Date().toISOString()
    const kpis = summarizeKpis(responseResults, citationResults, skippedResponses.length)
    const result = {
      generated_at: finishedAt,
      started_at: startedAt,
      brand_name: brandName,
      brand_url: brandUrl,
      brand_origin: brandNormalized.origin,
      mentions_sheet: mentions.sheet,
      citations_sheet: citations.sheet,
      responses: responseResults,
      cited_urls: citationResults,
      skipped_no_brand_citation: skippedResponses.map(s => ({
        pk: s.pk, master_outlet_id: s.master_outlet_id, response_id: s.response_id,
        platform: s.platform, product: s.product, query: s.query,
      })),
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

function summarizeKpis(responses, citations, skippedCount) {
  const byPlatform = {}
  for (const r of responses) {
    const p = r.platform || 'unknown'
    byPlatform[p] = byPlatform[p] || { total: 0, correct: 0, partially_incorrect: 0, incorrect: 0, unverifiable: 0 }
    byPlatform[p].total += 1
    byPlatform[p][r.verdict] = (byPlatform[p][r.verdict] || 0) + 1
  }
  const overall = responses.reduce((acc, r) => {
    acc[r.verdict] = (acc[r.verdict] || 0) + 1
    return acc
  }, { correct: 0, partially_incorrect: 0, incorrect: 0, unverifiable: 0 })
  const citationVerdicts = citations.reduce((acc, c) => {
    acc[c.verdict] = (acc[c.verdict] || 0) + 1
    return acc
  }, { reliable: 0, partially_unreliable: 0, unreliable: 0, unreachable: 0, unverifiable: 0 })
  const total = responses.length
  return {
    total_responses: total,
    skipped_no_brand_citation: skippedCount,
    overall_verdicts: overall,
    accuracy_pct: total ? Math.round((overall.correct / total) * 100) : 0,
    by_platform: byPlatform,
    total_citations: citations.length,
    citation_verdicts: citationVerdicts,
  }
}
