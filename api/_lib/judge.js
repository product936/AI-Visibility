import Anthropic from '@anthropic-ai/sdk'

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-7'
const MAX_RETRIES = 2

function client() {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY not configured on the server')
  return new Anthropic({ apiKey: key })
}

const RESPONSE_TOOL = {
  name: 'submit_verdict',
  description: 'Submit a structured factual verdict on the LLM response against the brand website.',
  input_schema: {
    type: 'object',
    required: ['verdict', 'confidence', 'summary', 'claims'],
    properties: {
      verdict: {
        type: 'string',
        enum: ['correct', 'partially_incorrect', 'incorrect', 'unverifiable'],
        description: 'Overall verdict about whether the response is factually correct against the brand ground truth.',
      },
      confidence: { type: 'number', minimum: 0, maximum: 1 },
      summary: { type: 'string', description: 'One-sentence explanation of the verdict.' },
      claims: {
        type: 'array',
        items: {
          type: 'object',
          required: ['text', 'verdict'],
          properties: {
            text: { type: 'string', description: 'A factual claim about the brand extracted from the response.' },
            verdict: {
              type: 'string',
              enum: ['SUPPORTED', 'CONTRADICTED', 'NOT_FOUND'],
              description: 'Whether the brand-site evidence supports, contradicts, or is silent on this claim.',
            },
            evidence: { type: 'string', description: 'Short quote from the brand-site page that supports the verdict, or empty.' },
            source_url: { type: 'string', description: 'URL of the brand-site page providing evidence, or empty.' },
          },
        },
      },
    },
  },
}

const CITATION_TOOL = {
  name: 'submit_citation_verdict',
  description: 'Judge whether a cited URL correctly supports the claims for which it was cited, and whether it contradicts the brand ground truth.',
  input_schema: {
    type: 'object',
    required: ['verdict', 'summary', 'issues'],
    properties: {
      verdict: {
        type: 'string',
        enum: ['reliable', 'partially_unreliable', 'unreliable', 'unreachable'],
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
            evidence: { type: 'string' },
          },
        },
      },
    },
  },
}

async function toolCall({ system, user, tool, tool_name, max_tokens = 1400 }) {
  const c = client()
  let lastErr
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const msg = await c.messages.create({
        model: MODEL,
        max_tokens,
        system,
        tools: [tool],
        tool_choice: { type: 'tool', name: tool_name },
        messages: [{ role: 'user', content: user }],
      })
      const block = msg.content.find(b => b.type === 'tool_use' && b.name === tool_name)
      if (block) return block.input
      lastErr = new Error('model did not call the expected tool')
    } catch (e) {
      lastErr = e
      if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, 800 * (attempt + 1)))
    }
  }
  throw lastErr
}

function snippets(pages) {
  return pages.map((p, i) => `[SRC ${i + 1}] ${p.title || '(no title)'} — ${p.url}\n${p.text.slice(0, 1200)}`).join('\n\n')
}

export async function judgeResponse({ brandName, brandOrigin, query, platform, response, pages }) {
  const system = `You are a factual verifier. Ground truth is the brand's own website (${brandName} — ${brandOrigin}). Ignore your general knowledge. If a claim about the brand is not on the supplied brand pages, say NOT_FOUND. Only mark CONTRADICTED when a brand page clearly states something different. When quoting evidence, use short verbatim snippets from the SRC blocks. Give a strict verdict: 'correct' only if ALL substantive brand claims are SUPPORTED; 'partially_incorrect' if some claims are CONTRADICTED but at least one is SUPPORTED; 'incorrect' if the main claim(s) are CONTRADICTED; 'unverifiable' if none of the claims can be found on the brand site.`
  const user =
    `QUERY: ${query}\n` +
    `PLATFORM (LLM under test): ${platform}\n\n` +
    `LLM RESPONSE:\n${response}\n\n` +
    `BRAND GROUND-TRUTH PAGES:\n${snippets(pages)}\n\n` +
    `Extract 3–8 atomic factual claims about the brand from the response. Verify each against the brand pages. Then submit the overall verdict via the submit_verdict tool.`
  try {
    return await toolCall({ system, user, tool: RESPONSE_TOOL, tool_name: 'submit_verdict' })
  } catch (e) {
    return { verdict: 'unverifiable', confidence: 0, summary: `Judge failed: ${String(e.message || e).slice(0, 200)}`, claims: [], _error: true }
  }
}

export async function judgeCitedUrl({ brandName, brandOrigin, response, url, urlContent, brandPages }) {
  const system = `You verify whether a third-party URL cited by an LLM (a) actually contains the specific claims for which it was cited and (b) contradicts the brand's own website (${brandName} — ${brandOrigin}). Consider a URL 'reliable' only if its content supports the LLM's use of it and does not contradict the brand site on factual claims. If the URL was unreachable, mark 'unreachable'.`
  const user =
    `LLM RESPONSE THAT CITED THIS URL:\n${response.slice(0, 3000)}\n\n` +
    `CITED URL: ${url}\n` +
    `CITED URL CONTENT (extracted):\n${urlContent.slice(0, 4000)}\n\n` +
    `BRAND GROUND-TRUTH PAGES:\n${snippets(brandPages)}\n\n` +
    `Submit the verdict via submit_citation_verdict.`
  try {
    return await toolCall({ system, user, tool: CITATION_TOOL, tool_name: 'submit_citation_verdict', max_tokens: 1000 })
  } catch (e) {
    return { verdict: 'unreachable', summary: `Judge failed: ${String(e.message || e).slice(0, 200)}`, issues: [], _error: true }
  }
}
