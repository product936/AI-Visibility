import Anthropic from '@anthropic-ai/sdk'

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-7'
const MAX_RETRIES = 2

function client() {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY not configured on the server')
  return new Anthropic({ apiKey: key })
}

const RESPONSE_TOOL = {
  name: 'submit_response_verdict',
  description: 'Judge whether the LLM response is factually correct against the brand pages supplied. Ground truth = the brand pages only.',
  input_schema: {
    type: 'object',
    required: ['verdict', 'summary', 'claims'],
    properties: {
      verdict: {
        type: 'string',
        enum: ['correct', 'partially_incorrect', 'incorrect', 'unverifiable'],
        description:
          "'correct' = all substantive brand claims are SUPPORTED by BRAND_PAGES. " +
          "'partially_incorrect' = some claims CONTRADICTED but at least one SUPPORTED. " +
          "'incorrect' = the main claim(s) are CONTRADICTED. " +
          "'unverifiable' = brand pages don't cover the claims.",
      },
      summary: { type: 'string', description: 'One-sentence explanation.' },
      claims: {
        type: 'array',
        description: '3-8 atomic factual claims about the brand extracted from the response.',
        items: {
          type: 'object',
          required: ['text', 'verdict'],
          properties: {
            text: { type: 'string', description: 'The claim as extracted.' },
            verdict: { type: 'string', enum: ['SUPPORTED', 'CONTRADICTED', 'NOT_FOUND'] },
            incorrect_data: { type: 'string', description: 'When CONTRADICTED: what the response said (the wrong bit).' },
            correct_data: { type: 'string', description: 'When CONTRADICTED: what the brand page actually says.' },
            evidence: { type: 'string', description: 'Short verbatim quote from the brand page.' },
            source_url: { type: 'string', description: 'Exact BRAND_PAGES url the evidence came from.' },
          },
        },
      },
    },
  },
}

function fmtSources(pages) {
  return pages.map((p, i) => `[SRC ${i + 1}] ${p.title || '(no title)'} — ${p.url}\n${(p.text || '').slice(0, 1500)}`).join('\n\n---\n\n')
}

export async function judgeResponse({
  brandName,
  brandOrigin,
  query,
  platform,
  response,
  brandPages,
}) {
  const c = client()

  const system =
    `You are a factual auditor for the brand "${brandName}" (${brandOrigin}). ` +
    `The BRAND_PAGES are the ONLY source of truth for this task. ` +
    `Do NOT use your general knowledge. ` +
    `Mark CONTRADICTED only when a BRAND_PAGE clearly states something different from the claim; ` +
    `mark NOT_FOUND when the brand pages don't cover the claim. ` +
    `For every CONTRADICTED claim, fill in incorrect_data (what the response said) and correct_data (what the brand page says).`

  const user =
    `USER QUERY: ${query}\n` +
    `LLM PLATFORM: ${platform}\n\n` +
    `LLM RESPONSE:\n${response}\n\n` +
    `BRAND_PAGES (ground truth):\n${fmtSources(brandPages)}\n\n` +
    `Extract 3–8 atomic factual claims about the brand from the response. Verify each against BRAND_PAGES only. Set the overall verdict. Return via the submit_response_verdict tool.`

  let lastErr
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const msg = await c.messages.create({
        model: MODEL,
        max_tokens: 1800,
        system,
        tools: [RESPONSE_TOOL],
        tool_choice: { type: 'tool', name: 'submit_response_verdict' },
        messages: [{ role: 'user', content: user }],
      })
      const block = msg.content.find(b => b.type === 'tool_use' && b.name === 'submit_response_verdict')
      if (block) return block.input
      lastErr = new Error('model did not call submit_response_verdict')
    } catch (e) {
      lastErr = e
      if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, 800 * (attempt + 1)))
    }
  }
  return { verdict: 'unverifiable', summary: `Judge failed: ${String(lastErr?.message || lastErr).slice(0, 200)}`, claims: [], _error: true }
}
