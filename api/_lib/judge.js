import Anthropic from '@anthropic-ai/sdk'

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-7'
const MAX_RETRIES = 2

function client() {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY not configured on the server')
  return new Anthropic({ apiKey: key })
}

const ANALYSIS_TOOL = {
  name: 'submit_analysis',
  description:
    'Submit the structured factual analysis for one LLM response: (a) the response verdict against its cited brand URLs, and (b) a verdict per third-party cited URL comparing it to the same brand URLs.',
  input_schema: {
    type: 'object',
    required: ['response_verdict', 'third_party_verdicts'],
    properties: {
      response_verdict: {
        type: 'object',
        required: ['verdict', 'summary', 'claims'],
        properties: {
          verdict: {
            type: 'string',
            enum: ['correct', 'partially_incorrect', 'incorrect', 'unverifiable'],
            description:
              "'correct' iff ALL substantive brand claims are SUPPORTED by the brand URLs; 'partially_incorrect' if some claims are CONTRADICTED but some are SUPPORTED; 'incorrect' if the main claim(s) are CONTRADICTED; 'unverifiable' if the brand URLs don't cover the claims.",
          },
          summary: { type: 'string' },
          claims: {
            type: 'array',
            items: {
              type: 'object',
              required: ['text', 'verdict'],
              properties: {
                text: { type: 'string', description: 'Atomic factual claim about the brand extracted from the response.' },
                verdict: { type: 'string', enum: ['SUPPORTED', 'CONTRADICTED', 'NOT_FOUND'] },
                evidence: { type: 'string', description: 'Short verbatim quote from the brand URL supporting the verdict, or empty.' },
                source_url: { type: 'string', description: 'Exact brand URL from BRAND_URLS whose content supports the verdict.' },
              },
            },
          },
        },
      },
      third_party_verdicts: {
        type: 'array',
        description: 'One entry per third-party cited URL provided. Empty if none were provided.',
        items: {
          type: 'object',
          required: ['url', 'verdict', 'summary'],
          properties: {
            url: { type: 'string', description: 'Exact URL from THIRD_PARTY_URLS being judged.' },
            verdict: {
              type: 'string',
              enum: ['reliable', 'partially_unreliable', 'unreliable', 'unreachable'],
              description: "'reliable' = no contradiction with the brand URLs; 'partially_unreliable' = minor mismatches; 'unreliable' = clear factual contradiction; 'unreachable' if the URL had no usable content.",
            },
            summary: { type: 'string' },
            issues: {
              type: 'array',
              items: {
                type: 'object',
                required: ['type', 'detail'],
                properties: {
                  type: {
                    type: 'string',
                    enum: ['contradicts_brand', 'does_not_support_claim', 'stale', 'off_topic', 'other'],
                  },
                  detail: { type: 'string' },
                  evidence: { type: 'string', description: 'Short verbatim quote from the third-party URL demonstrating the mismatch.' },
                  brand_source_url: { type: 'string', description: 'Exact brand URL that contradicts the third-party content.' },
                },
              },
            },
          },
        },
      },
    },
  },
}

function fmtSources(pages) {
  return pages.map((p, i) => `[SRC ${i + 1}] ${p.title || '(no title)'} — ${p.url}\n${(p.text || '').slice(0, 1400)}`).join('\n\n---\n\n')
}

export async function analyzeResponse({
  brandName,
  brandOrigin,
  query,
  platform,
  response,
  brandPages,
  thirdPartyPages,
}) {
  const c = client()

  const system =
    `You are a factual auditor for the brand "${brandName}" (${brandOrigin}). ` +
    `Ground truth for THIS analysis is the set of BRAND_URLS provided below — extracted content from the brand's own web pages that were cited by the LLM. ` +
    `Do NOT use your general knowledge. Only mark CONTRADICTED when a BRAND_URL clearly states something different from the claim. ` +
    `Use NOT_FOUND when the brand URLs don't cover the claim. ` +
    `Third-party URLs must be judged strictly against the BRAND_URLS: a third-party is 'reliable' only if it does not contradict the brand URLs on any factual claim relevant to the response.`

  const user =
    `USER QUERY: ${query}\n` +
    `LLM PLATFORM: ${platform}\n\n` +
    `LLM RESPONSE:\n${response}\n\n` +
    `BRAND_URLS (ground truth for this response):\n${fmtSources(brandPages)}\n\n` +
    (thirdPartyPages.length
      ? `THIRD_PARTY_URLS to judge against the brand URLs:\n${fmtSources(thirdPartyPages)}\n\n`
      : `THIRD_PARTY_URLS: (none)\n\n`) +
    `Tasks:\n` +
    `A) Extract 3–8 atomic factual claims about the brand from the LLM response. For each, mark SUPPORTED / CONTRADICTED / NOT_FOUND against the BRAND_URLS. Quote a short evidence snippet and give the source_url. Then set the overall response verdict.\n` +
    `B) For every entry in THIRD_PARTY_URLS, decide reliable / partially_unreliable / unreliable / unreachable relative to the BRAND_URLS. List concrete issues with evidence.\n` +
    `Return everything via the submit_analysis tool.`

  let lastErr
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const msg = await c.messages.create({
        model: MODEL,
        max_tokens: 2200,
        system,
        tools: [ANALYSIS_TOOL],
        tool_choice: { type: 'tool', name: 'submit_analysis' },
        messages: [{ role: 'user', content: user }],
      })
      const block = msg.content.find(b => b.type === 'tool_use' && b.name === 'submit_analysis')
      if (block) return block.input
      lastErr = new Error('model did not call submit_analysis')
    } catch (e) {
      lastErr = e
      if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, 800 * (attempt + 1)))
    }
  }
  return {
    response_verdict: { verdict: 'unverifiable', summary: `Judge failed: ${String(lastErr?.message || lastErr).slice(0, 200)}`, claims: [] },
    third_party_verdicts: [],
    _error: true,
  }
}
