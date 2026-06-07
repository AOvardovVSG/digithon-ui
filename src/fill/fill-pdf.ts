import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PDFDocument, type PDFFont, type PDFPage, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { PropertyProposal } from '@/mastra/schemas/proposal';
import { ADAPTERS } from './adapters';
import type { FieldDef, FillOp } from './adapter-kit';

/**
 * Runtime PDF filler. Loads a blanked provider template, runs that provider's adapter to
 * turn the proposal into stamping ops, and draws text / vector checkmarks at the field
 * rectangles extracted offline — producing a flattened, ready-to-send PDF. Pure pdf-lib
 * (no AcroForm parsing), so it survives the providers' messy form structures.
 */

const INK = rgb(0.07, 0.09, 0.42); // deep indigo, reads as "filled in"
const CHECK = rgb(0.1, 0.45, 0.12);

// All property/industrial-fire templates live under this directory.
const TEMPLATE_BASE = join(process.cwd(), 'public', 'templates', 'property');
const FONT_REGULAR = join(process.cwd(), 'public', 'fonts', 'Roboto-Regular.ttf');

const fontBytes = readFileSync(FONT_REGULAR);

interface Template {
  bytes: Uint8Array;
  byName: Map<string, FieldDef[]>;
}
const templateCache = new Map<string, Template>();

function loadTemplate(providerId: string): Template {
  const cached = templateCache.get(providerId);
  if (cached) return cached;

  const dir = join(TEMPLATE_BASE, providerId);
  const bytes = new Uint8Array(readFileSync(join(dir, 'template.pdf')));
  const parsed = JSON.parse(readFileSync(join(dir, 'fields.json'), 'utf8')) as {
    fields: FieldDef[];
  };
  const byName = new Map<string, FieldDef[]>();
  for (const f of parsed.fields) {
    if (!f.name) continue;
    const list = byName.get(f.name);
    if (list) list.push(f);
    else byName.set(f.name, [f]);
  }
  const template: Template = { bytes, byName };
  templateCache.set(providerId, template);
  return template;
}

/** Resolve the widget a fill op targets (honouring `index` for shared names). */
function resolveField(byName: Map<string, FieldDef[]>, op: FillOp): FieldDef | undefined {
  const list = byName.get(op.field);
  if (!list || list.length === 0) return undefined;
  return list[op.index ?? 0] ?? list[0];
}

function stampText(page: PDFPage, font: PDFFont, f: FieldDef, value: string, align: FillOp['align']) {
  const [x0, y0, x1, y1] = f.rect;
  const boxW = x1 - x0;
  const boxH = y1 - y0;
  // Fit the font size to the box height, then shrink to the width if needed.
  let size = Math.min(11, Math.max(6.5, boxH - 3));
  const maxW = Math.max(4, boxW - 4);
  while (size > 5 && font.widthOfTextAtSize(value, size) > maxW) size -= 0.5;

  const textW = font.widthOfTextAtSize(value, size);
  let x = x0 + 2;
  if (align === 'center') x = x0 + (boxW - textW) / 2;
  else if (align === 'right') x = x1 - textW - 2;
  // Baseline ~ vertically centred within the box.
  const y = y0 + (boxH - size) / 2 + size * 0.22;
  page.drawText(value, { x, y, size, font, color: INK });
}

function stampCheck(page: PDFPage, f: FieldDef) {
  const [x0, y0, x1, y1] = f.rect;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const s = Math.min(x1 - x0, y1 - y0);
  // Vector check — Roboto has no ✔ glyph, so draw it (matches report-pdf.ts).
  page.drawSvgPath(`M ${-s * 0.32} ${-s * 0.02} L ${-s * 0.06} ${s * 0.26} L ${s * 0.36} ${-s * 0.3}`, {
    x: cx,
    y: cy,
    borderColor: CHECK,
    borderWidth: Math.max(1.1, s * 0.13),
  });
}

export interface FilledPdf {
  providerId: string;
  filename: string;
  mimeType: 'application/pdf';
  /** `data:application/pdf;base64,...` — convenient over JSON, like /api/analyze. */
  dataUrl: string;
  /** Fields requested by the adapter that weren't found in the template (for diagnostics). */
  missingFields: string[];
}

/** Fill one provider's template with the proposal answers. Throws if no adapter exists. */
export async function fillProvider(
  providerId: string,
  proposal: PropertyProposal,
): Promise<FilledPdf> {
  const adapter = ADAPTERS[providerId];
  if (!adapter) throw new Error(`No adapter for provider "${providerId}"`);

  const { bytes, byName } = loadTemplate(providerId);
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(fontBytes, { subset: true });
  const pages = doc.getPages();

  const ops = adapter(proposal).filter((o): o is FillOp => Boolean(o));
  const missing = new Set<string>();

  for (const op of ops) {
    const field = resolveField(byName, op);
    if (!field) {
      missing.add(op.field);
      continue;
    }
    const page = pages[field.page];
    if (!page) continue;
    if (op.kind === 'text' && op.value) stampText(page, font, field, op.value, op.align);
    else if (op.kind === 'check') stampCheck(page, field);
  }

  const out = await doc.save();
  const base64 = Buffer.from(out).toString('base64');
  return {
    providerId,
    filename: `${providerId}-предложение.pdf`,
    mimeType: 'application/pdf',
    dataUrl: `data:application/pdf;base64,${base64}`,
    missingFields: [...missing],
  };
}

/** Fill several providers; never rejects on a single provider's failure. */
export async function fillProviders(
  providerIds: string[],
  proposal: PropertyProposal,
): Promise<Array<FilledPdf | { providerId: string; error: string }>> {
  return Promise.all(
    providerIds.map(async (id) => {
      try {
        return await fillProvider(id, proposal);
      } catch (e) {
        return { providerId: id, error: e instanceof Error ? e.message : String(e) };
      }
    }),
  );
}
