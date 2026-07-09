# AI Visibility — Prototype

Dashboard prototype for monitoring how IndusInd Bank appears in AI answers across ChatGPT, Google AI, Gemini, Perplexity, and Claude.

## Stack

- React 18 + Vite
- Tailwind CSS
- Recharts
- React Router

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Build

```bash
npm run build
npm run preview
```

## Data

Dummy data lives in `src/data/dummy.js`. Will be replaced with Excel-driven data later.

## Data Checker (LLM factual verification)

A dashboard page under **Pages AI → Data Checker** at `/data-checker` verifies the factual correctness of an LLM-response spreadsheet against a brand website you supply as canonical ground truth.

Inputs on the page:

- **Brand name** — free text (e.g. `IndusInd Bank`).
- **Brand website URL** — the site to treat as ground truth (e.g. `https://www.indusind.com/`).
- **LLM responses (.xlsx)** — sheet with at least `question_text`, `platform`, `ai_response` columns. Optional second sheet with `url`, `cited_by` columns (or the URL columns you use) enables per-URL checks.
- **Run Now** — POSTs to `/api/check` which streams SSE progress back to the page.

The backend serverless function:

1. Parses the Excel (schema-flexible via column-alias detection).
2. Crawls the brand website (sitemap → page fetch, capped) and extracts text.
3. For each response, has Claude extract atomic factual claims about the brand and verify each against the brand pages via retrieval — verdict is one of `correct` / `partially_incorrect` / `incorrect` / `unverifiable`.
4. For each cited URL (from a citation sheet or extracted from response text), Claude judges whether it actually supports the citing claim and whether it contradicts the brand site.
5. Returns a full JSON result you can download from the page.

### Setup

```bash
cp .env.example .env.local
# fill in ANTHROPIC_API_KEY
npm install
npm run dev
```

Open http://localhost:5173/data-checker.

For Vercel: add `ANTHROPIC_API_KEY` in **Project Settings → Environment Variables**. The `/api/check` function is configured with `maxDuration: 300` in `vercel.json`.
