import formidable from 'formidable'
import fs from 'node:fs/promises'
import pLimit from 'p-limit'
import { loadMentions, loadCitations } from './_lib/excel.js'
import {
  fetchUrl, isBrandUrl, normalizeBrandUrl, resetCaches,
  discoverBrandCorpus, searchBrandForResponse,
} from './_lib/crawl.js'
import { judgeResponse } from './_lib/judge.js'

export const config = {
  api: { bodyParser: false },
  maxDuration: 300,
}

const MAX_RESPONSES = Number(process.env.CHECKER_MAX_RESPONSES || 200)
const JUDGE_CONCURRENCY = Number(process.env.CHECKER_JUDGE_CONCURRENCY || 4)
const SEARCH_CONCURRENCY = Number(process.env.CHECKER_SEARCH_CONCURRENCY || 4)

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
  resetCaches()

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
    if (!citationsFile) throw new Error('Citations Excel file is required (field: citationsFile).')
    if (!brandUrl) throw new Error('Brand URL is required.')

    const brandNormalized = normalizeBrandUrl(brandUrl)
    if (!brandNormalized) throw new Error(`Brand URL "${brandUrl}" is not a valid URL.`)

    const mentions = loadMentions(await fs.readFile(mentionsFile.filepath))
    const citations = loadCitations(await fs.readFile(citationsFile.filepath))
    if (!mentions.rows.length) throw new Error('No response rows detected in mentions file.')

    // Index brand-owned citations by response pk.
    const brandCitationsByPk = new Map()
    for (const c of citations.rows) {
      if (!isBrandUrl(c.url, brandNormalized.origin, c.ownership)) continue
      if (!brandCitationsByPk.has(c.pk)) brandCitationsByPk.set(c.pk, [])
      brandCitationsByPk.get(c.pk).push(c)
    }

    const responsesAll = mentions.rows.slice(0, MAX_RESPONSES)
    const droppedResponses = mentions.rows.length - responsesAll.length

    send({
      type: 'loaded',
      brandName,
      brandUrl,
      brand_origin: brandNormalized.origin,
      mentions_count: mentions.rows.length,
      citations_count: citations.rows.length,
      responses_to_analyze: responsesAll.length,
    })

    // Discover brand corpus once (best-effort; sitemap or homepage fallback).
    send({ type: 'log', message: `Discovering brand pages on ${brandNormalized.origin}…` })
    let corpusSize = 0
    try {
      const corpus = await discoverBrandCorpus(brandNormalized.origin)
      corpusSize = corpus.length
      send({ type: 'log', message: `Brand corpus: ${corpusSize} URLs discovered.` })
    } catch (e) {
      send({ type: 'log', message: `Brand discovery failed: ${e.message}. Will still try direct fetch of cited brand URLs.` })
    }
    send({ type: 'discovery_done', corpus_size: corpusSize })

    const results = []
    const searchLimit = pLimit(SEARCH_CONCURRENCY)
    const judgeLimit = pLimit(JUDGE_CONCURRENCY)

    // Kick off per-response processing in parallel (bounded).
    let done = 0
    await Promise.all(responsesAll.map((r, idx) => (async () => {
      send({ type: 'response_start', index: idx, total: responsesAll.length, pk: r.pk, platform: r.platform, product: r.product })

      const citedBrand = brandCitationsByPk.get(r.pk) || []
      let brandPages = []
      let brand_source = 'cited' // 'cited' | 'searched' | 'none'

      if (citedBrand.length) {
        const fetched = await Promise.all(citedBrand.map(c => fetchUrl(c.url)))
        brandPages = fetched
          .filter(f => f.ok && f.text)
          .map(f => ({ url: f.url, title: f.title, text: f.text }))
      }

      if (!brandPages.length && corpusSize > 0) {
        const searched = await searchLimit(() => searchBrandForResponse({
          brandOrigin: brandNormalized.origin,
          response: r,
        }))
        brandPages = searched.pages
        brand_source = brandPages.length ? 'searched' : 'none'
      } else if (!brandPages.length) {
        brand_source = 'none'
      } else {
        brand_source = 'cited'
      }

      const base = {
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
        brand_source,
        brand_pages_used: brandPages.map(p => ({ url: p.url, title: p.title })),
        cited_brand_urls: citedBrand.map(c => ({ url: c.url, source: c.source, ownership: c.ownership })),
      }

      if (!brandPages.length) {
        const row = { ...base, verdict: 'no_brand_page', summary: 'No brand-owned source was cited for this prompt, and no relevant page was found on the brand website.', claims: [] }
        results.push(row)
        done++
        send({ type: 'response_done', index: idx, total: responsesAll.length, row, done })
        return
      }

      const verdict = await judgeLimit(() => judgeResponse({
        brandName,
        brandOrigin: brandNormalized.origin,
        query: r.query,
        platform: r.platform,
        response: r.response,
        brandPages,
      }))

      const row = {
        ...base,
        verdict: verdict.verdict || 'unverifiable',
        summary: verdict.summary || '',
        claims: verdict.claims || [],
      }
      results.push(row)
      done++
      send({ type: 'response_done', index: idx, total: responsesAll.length, row, done })
    })()))

    // Final aggregation.
    const finishedAt = new Date().toISOString()
    const kpis = summarizeKpis(results)
    const result = {
      generated_at: finishedAt,
      started_at: startedAt,
      brand_name: brandName,
      brand_url: brandUrl,
      brand_origin: brandNormalized.origin,
      responses: results,
      dropped_responses: droppedResponses,
      corpus_size: corpusSize,
      kpis,
    }
    send({ type: 'done', result })
    res.end()
  } catch (e) {
    send({ type: 'error', error: String(e?.message || e) })
    res.end()
  }
}

function summarizeKpis(responses) {
  const overall = { correct: 0, partially_incorrect: 0, incorrect: 0, unverifiable: 0, no_brand_page: 0 }
  const byPlatform = {}
  const bySource = { cited: 0, searched: 0, none: 0 }
  for (const r of responses) {
    overall[r.verdict] = (overall[r.verdict] || 0) + 1
    bySource[r.brand_source] = (bySource[r.brand_source] || 0) + 1
    const p = r.platform || 'unknown'
    byPlatform[p] = byPlatform[p] || { total: 0, correct: 0, partially_incorrect: 0, incorrect: 0, unverifiable: 0, no_brand_page: 0 }
    byPlatform[p].total += 1
    byPlatform[p][r.verdict] = (byPlatform[p][r.verdict] || 0) + 1
  }
  const analyzed = responses.length
  const judged = analyzed - (overall.no_brand_page || 0)
  const incorrect = (overall.incorrect || 0) + (overall.partially_incorrect || 0)
  return {
    total_analyzed: analyzed,
    total_judged: judged,
    prompts_incorrect: incorrect,
    prompts_no_brand_page: overall.no_brand_page || 0,
    overall_verdicts: overall,
    accuracy_pct: judged ? Math.round((overall.correct / judged) * 100) : 0,
    by_platform: byPlatform,
    brand_source_split: bySource,
  }
}
