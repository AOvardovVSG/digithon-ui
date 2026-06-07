# Insurance Offer Comparison Agent — Backend

A Mastra agent that performs a comparative analysis of insurance offers (PDF / Excel /
Word) from multiple Bulgarian insurers and recommends the **best and most advantageous**
offer for the client. Built for an insurance broker. Output is structured (zod) and
bilingual (BG + EN), plus a generated PDF report a layperson can read.

## Stack

- **Mastra** v1 (`@mastra/core`) — the agent + structured output
- **OpenAI** `gpt-5.5` (configurable via `OPENAI_MODEL`), via Mastra's `openai/<model>` router
- **Next.js 16** App Router route handler (Node.js runtime)
- Parsing: PDFs sent directly to the model; **mammoth** (DOCX) + **SheetJS xlsx** (XLSX) extracted to text
- **pdfmake** for the PDF report (Roboto font — full Cyrillic)

## Setup

```bash
cp .env.example .env.local      # then fill in OPENAI_API_KEY
bun install
bun run dev                     # Next.js dev server on http://localhost:3000
```

Env vars (`.env.local`):

| Var | Required | Default | Notes |
|-----|----------|---------|-------|
| `OPENAI_API_KEY` | yes | — | needed for the live analysis |
| `OPENAI_MODEL` | no | `gpt-5.5` | cheaper alt: `gpt-5.4-mini` |

## API

### `POST /api/analyze`

`multipart/form-data`:

| Field | Type | Notes |
|-------|------|-------|
| `files` | File ×N (≥2) | the offers — `.pdf`, `.docx`, `.xlsx` |
| `profile` | string (optional) | JSON matching `ClientProfileSchema` (demands & needs) |
| `reportLang` | `"bg"` \| `"en"` (optional) | PDF language, default `bg` |

Limits: ≥2 files, ≤45 MB total (OpenAI per-request file cap).

**Response** `200`:

```jsonc
{
  "result": { /* ComparisonResult — see src/mastra/schemas/output.ts */ },
  "report": {
    "filename": "insurance-comparison-bg.pdf",
    "mimeType": "application/pdf",
    "dataUrl": "data:application/pdf;base64,...."
  }
}
```

Errors: `400` (bad input / <2 files / bad profile JSON), `413` (too large), `500`.

Example:

```bash
curl -X POST http://localhost:3000/api/analyze \
  -F "files=@oferta1.pdf" \
  -F "files=@oferta2.xlsx" \
  -F 'profile={"insuranceTypeHint":"Автокаско","budgetMaxAnnual":1500,"currency":"BGN","priorities":["пълно покритие"],"riskAppetite":"low","subjectDetails":null,"currentInsurer":null,"notes":null}' \
  -F "reportLang=bg"
```

## Output shape (`ComparisonResult`)

Every user-facing **text** field is bilingual `{ bg, en }` (`LocalizedText`); identifiers
and numbers (insurer name, filename, premium, scores) are single-valued. Key parts:

- `detectedInsuranceType`, `executiveSummary`, `clientNeedsSummary`
- `offers[]` — per offer: premium, sum insured, deductible, coverages, exclusions,
  assistance, claims handling, **strengths/weaknesses**, **redFlags**, per-dimension
  `scores` (0–100) and `weightedScore`
- `winner` (most advantageous), `cheapest`, `bestCoverage` — often different offers
- `recommendation`, `whatToWatch`, `glossary`, `disclaimers`

The recommendation uses a weighted framework (coverage 30 / price-vs-coverage 25 /
exclusions 12 / deductible 10 / claims 10 / assistance 5 / reliability 5 / flexibility 3)
encoded in the system prompt, with the guiding rule **„най-евтиното ≠ най-изгодното"**.

## Project layout

```
src/mastra/
  index.ts                              Mastra instance
  agents/insurance-comparison-agent.ts  the Agent (model, system prompt)
  prompts/insurance-system-prompt.ts    expert Bulgarian system prompt
  schemas/{input,output}.ts             zod schemas (input + bilingual output)
  lib/document-parsing.ts               files → model content parts
  lib/analyze.ts                        orchestration: parse → generate → render
  lib/report-pdf.ts                     ComparisonResult → PDF (bg/en)
src/app/api/analyze/route.ts            HTTP endpoint
scripts/smoke.ts                        offline test (PDF + XLSX, no API key)
```

## Testing

```bash
bun run smoke      # offline: validates schema, renders BG+EN PDFs to ./out, parses XLSX
bun run typecheck  # tsc --noEmit
bun run lint
```

`smoke` covers everything except the live OpenAI call (which needs `OPENAI_API_KEY`).

## Known follow-ups

- **PDF delivery**: currently returned as a base64 data URL inside the JSON. For large
  reports, switch to a streamed binary download via a separate `GET /api/report/[id]`
  endpoint (needs a short-lived cache for the generated buffer).
- **DOCX/PDF parsing** of unusual layouts may vary; for tricky PDFs the model reads the
  file directly (best fidelity). `unpdf` can be added as a local text-extraction fallback.
- **Frontend** is intentionally out of scope here; it consumes `POST /api/analyze`.
