# Provider Proposal Filling — Feature

A second feature alongside the offer-comparison agent: the broker creates a **case**
(insurance line + selected insurers), shares a link with the customer, the customer fills a
**Typeform-style questionnaire**, the broker completes/edits it, then downloads the
**pre-filled insurer PDFs**.

Scope today: one line — **property / industrial-fire for businesses** — across 8 insurers.

## Flow & lifecycle

```
BROKER  /cases            CUSTOMER  /form/<token>        BROKER  /cases/<id>
 new case (line+insurers) → guided questionnaire  →       review + fill gaps + edit
   → shareable link         autosaves, submits            → "Generate" → filled PDFs
status: draft → awaiting_customer → customer_filled → completed
```

## How the PDF filling works (the core trick)

The 8 insurer questionnaires are **AcroForm PDFs** with hundreds of fields, but they use
object/xref-stream compression and have malformed field refs — `pdf-lib`'s form parser and
`pypdf` both choke, and field names are mostly auto-generated (`Text34`, `Check Box3`). So:

- **Offline** (`scripts/prepare-templates.py`, pikepdf/qpdf): for each insurer, normalize the
  PDF, **blank** all sample values, and extract every widget's `{name, type, page, rect}` to
  `public/templates/property/<id>/fields.json`. Page previews go to `.tmp/previews/`.
- **Runtime** (`src/fill/fill-pdf.ts`, pure `pdf-lib`): load the blank template, embed Roboto
  (Cyrillic), and **stamp** the answers as text / vector checkmarks at the extracted rects.
  No AcroForm parsing → survives the messy forms. Output is a flattened, ready-to-send PDF.

Mapping a canonical answer → a provider's fields is a small **adapter**
(`src/fill/adapters/<id>.ts`) built with the `adapter-kit` helpers (`T`, `C`, `Choice`,
`Multi`, `YN`). Adapters are deterministic — the agent's role is to help author them offline,
not to fill at request time.

## Layout

```
public/templates/property/<id>/{template.pdf, fields.json}   # committed, from prepare-templates.py
public/providers/<id>.svg                                    # logos (Allianz/Groupama/Uniqa real; rest = styled badge)
public/fonts/Roboto-Regular.ttf                              # Cyrillic font for stamping
src/db/{schema,index,cases}.ts                               # Drizzle + better-sqlite3 (cases table)
src/fill/registry.ts                                         # lines + providers + ADAPTER_READY
src/fill/questionnaire.ts                                    # the canonical question list (drives the UI)
src/fill/{adapter-kit,fill-pdf}.ts  +  adapters/<id>.ts      # stamping engine + per-provider maps
src/mastra/schemas/proposal.ts                               # PropertyProposalSchema (zod, all optional)
src/app/cases, src/app/form/[token]                          # broker + customer pages
src/app/api/cases, .../[id], .../[id]/fill, .../form/[token] # route handlers
src/components/proposal/*                                    # ProviderPicker, ProposalForm (stepper), etc.
```

## Provider status

**Ready** (verified): `allianz`, `armeec`, `bulgaria-insurance`, `bulstrad`, `groupama`,
`ozk`, `uniqa`. **Coming soon** (template + fields.json extracted; adapter not yet authored):
`axiom`. The UI shows an "Очаквайте" tag; the fill route returns it under `notReady`.

All ready providers fill the checkboxes that map to the canonical schema (rendered as green
vector checks, verified per provider):
- `bulgaria-insurance` — full set (payment, building use/type, construction, roof, glazing,
  security, fire measures, occupancy, all yes/no risk questions, sum basis)
- `armeec` — building type, ownership, commissioned, occupancy, wall + roof construction
- `allianz` — wall + roof construction (+ year/floors/area/staff text)
- `groupama` — the four risk да/не that match (insured-elsewhere, losses, landslide, flammable)
- `bulstrad` — sum basis, property-address choice, glass clause, payment
- `uniqa` — "В качеството му на" (owner/tenant/other)
- `ozk` — the two risk да/не (insured-elsewhere, losses)

Not mapped (out of scope): the per-line-item coverage matrices in allianz/bulstrad/groupama
(a clause-checkbox grid *per inventory row*) — left for the broker.

Templates are fully flattened (the AcroForm + Widget layer is stripped in
`prepare-templates.py` after rects are extracted) so stamped text/checks are never hidden by
a widget's opaque `/MK` background — this was the fix for `uniqa`.

## Adding a provider adapter

1. `bun run templates <id>` (already run for all 8) → `template.pdf` + `fields.json` + preview.
2. `node scripts/overlay-fields.mjs <id>` → renders the blank form with field **names**
   overlaid, so you can map each canonical question to a field name by sight (most checkbox
   names match their printed label; text fields often need position).
3. Write `src/fill/adapters/<id>.ts` (copy `bulgaria-insurance.ts`); register it in
   `adapters/index.ts` and add the id to `ADAPTER_READY` in `registry.ts`.
4. `bun run smoke:fill` → writes filled PDFs to `./out`; render a page
   (`pdftoppm -png -r 130 out/fill-<id>.pdf /tmp/x`) and verify alignment; iterate.

## Setup / commands

```bash
bun install            # better-sqlite3 is native — `bun pm trust better-sqlite3` if its build was skipped
bun run db:generate    # regenerate the Drizzle migration after a schema change
bun run dev            # runs under Node (not bun) via the next shebang, so better-sqlite3 works
bun run smoke:fill     # fill the ready providers with sample data -> ./out
```

DB lives at `data/digithon.db` (gitignored); migrations auto-apply on first DB use.
