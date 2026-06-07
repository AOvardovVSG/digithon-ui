import pdfmake from 'pdfmake';
// Default Roboto font descriptor (absolute TTF paths). Roboto ships full Cyrillic,
// which is required for Bulgarian text. No extra font vendoring needed.
import robotoFonts from 'pdfmake/fonts/Roboto.js';
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import type { ClientProfile } from '../schemas/input';
import type {
  ComparisonResult,
  CoverageCell,
  Lang,
  LocalizedText,
  NamedPick,
  OfferAnalysis,
} from '../schemas/output';

// Configure the pdfmake singleton once. Allow local access (needed so it can read the
// bundled font files) and deny external URL fetches (we never reference remote
// resources in our document, so this is the safe default and silences the warnings).
pdfmake.setFonts(robotoFonts);
pdfmake.setLocalAccessPolicy(() => true);
pdfmake.setUrlAccessPolicy(() => false);

export interface RenderedPdf {
  buffer: Buffer;
  filename: string;
  /** `data:application/pdf;base64,...` — convenient for returning over JSON. */
  dataUrl: string;
}

/** Pick the requested language from a bilingual field, with sensible fallbacks. */
function t(value: LocalizedText | null | undefined, lang: Lang): string {
  if (!value) return '';
  return value[lang] || value.bg || value.en || '';
}

const LABELS: Record<Lang, Record<string, string>> = {
  bg: {
    title: 'Сравнителен анализ на застрахователни оферти',
    type: 'Вид застраховка',
    summary: 'Кратко резюме и препоръка',
    clientNeeds: 'Вашите изисквания и потребности',
    mostAdvantageous: 'Най-изгодна',
    cheapest: 'Най-евтина',
    bestCoverage: 'Най-пълно покритие',
    insuredSubject: 'Обект на застраховане',
    address: 'Адрес',
    coverageMatrix: 'Сравнителна матрица на покритията',
    coverageCol: 'Застрахователни покрития',
    premiumRow: 'Застрахователна премия',
    overviewTable: 'Обобщена таблица',
    insurer: 'Застраховател',
    premium: 'Годишна премия',
    deductible: 'Самоучастие',
    score: 'Оценка',
    offerDetails: 'Подробен преглед на офертите',
    strengths: 'Силни страни',
    weaknesses: 'Слаби страни',
    redFlags: 'Внимание (червени флагове)',
    coverages: 'Покрития',
    exclusions: 'Изключения',
    assistance: 'Асистанс',
    claims: 'Ликвидация на щети',
    sumInsured: 'Застрахователна сума / лимит',
    payment: 'Плащане',
    similarities: 'Прилики между офертите',
    differences: 'Разлики между офертите',
    whatToWatch: 'На какво да обърнете внимание',
    glossary: 'Речник на термините',
    disclaimers: 'Важни уточнения',
    product: 'Продукт',
    file: 'Файл',
    na: 'няма данни',
  },
  en: {
    title: 'Comparative analysis of insurance offers',
    type: 'Insurance type',
    summary: 'Summary & recommendation',
    clientNeeds: 'Your demands & needs',
    mostAdvantageous: 'Most advantageous',
    cheapest: 'Cheapest',
    bestCoverage: 'Best coverage',
    insuredSubject: 'Insured subject',
    address: 'Address',
    coverageMatrix: 'Coverage comparison matrix',
    coverageCol: 'Insurance coverages',
    premiumRow: 'Insurance premium',
    overviewTable: 'Overview table',
    insurer: 'Insurer',
    premium: 'Annual premium',
    deductible: 'Deductible',
    score: 'Score',
    offerDetails: 'Detailed offer review',
    strengths: 'Strengths',
    weaknesses: 'Weaknesses',
    redFlags: 'Watch out (red flags)',
    coverages: 'Coverages',
    exclusions: 'Exclusions',
    assistance: 'Assistance',
    claims: 'Claims handling',
    sumInsured: 'Sum insured / limit',
    payment: 'Payment',
    similarities: 'Similarities between offers',
    differences: 'Differences between offers',
    whatToWatch: 'What to watch out for',
    glossary: 'Glossary',
    disclaimers: 'Important notes',
    product: 'Product',
    file: 'File',
    na: 'no data',
  },
};

function premiumText(offer: OfferAnalysis, na: string): string {
  if (offer.annualPremium == null) return na;
  return `${offer.annualPremium.toLocaleString('bg-BG')} ${offer.currency}`;
}

function bulletList(items: string[], emptyMark = '—'): Content {
  const filtered = items.filter(Boolean);
  if (filtered.length === 0) return { text: emptyMark, italics: true, color: '#888' };
  return { ul: filtered, margin: [0, 2, 0, 4] };
}

function pickBlock(label: string, pick: NamedPick, lang: Lang, color: string): Content {
  return {
    stack: [
      { text: label, bold: true, color, fontSize: 10 },
      { text: pick.insurer, bold: true, fontSize: 12, margin: [0, 1, 0, 1] },
      { text: t(pick.reason, lang), fontSize: 9, color: '#444' },
    ],
  };
}

/** Format an amount + optional currency, e.g. "5 112 308.50 BGN". */
function moneyText(amount: number | null, currency: string | null, na: string): string {
  if (amount == null) return na;
  return `${amount.toLocaleString('bg-BG')}${currency ? ` ${currency}` : ''}`;
}

/** Normalize an insurer name for matching cells/premiums to matrix columns. */
function normName(s: string): string {
  return s.trim().toLowerCase();
}

/** The "Обект на застраховане" header block — itemized insured objects + address. */
function insuredSubjectBlock(result: ComparisonResult, lang: Lang, L: Record<string, string>): Content[] {
  const subject = result.insuredSubject;
  if (!subject || (subject.items.length === 0 && !subject.address)) return [];

  const out: Content[] = [{ text: L.insuredSubject, fontSize: 14, bold: true, margin: [0, 8, 0, 2] }];

  if (subject.items.length) {
    out.push({
      table: {
        widths: ['*', 'auto'],
        body: subject.items.map((it) => [
          { text: t(it.label, lang), fontSize: 9 },
          { text: moneyText(it.sumInsured, it.currency, '—'), fontSize: 9, alignment: 'right' },
        ]),
      },
      layout: 'lightHorizontalLines',
      margin: [0, 0, 0, 4],
    });
  }
  if (subject.address) {
    out.push({
      text: [{ text: `${L.address}: `, bold: true }, t(subject.address, lang)],
      fontSize: 9,
      margin: [0, 0, 0, 6],
    });
  }
  return out;
}

/**
 * A checkmark as inline SVG. The bundled Roboto font has no dingbat glyphs (✔/✓ render
 * as tofu), so we draw the tick as vector — font-independent and crisp at any size.
 */
function svgCheck(color: string): Content {
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12"><path d="M2.5 6.5 L5 9 L9.5 3.5" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    width: 9,
    alignment: 'center',
  };
}

/** Render one matrix cell: a sub-limit/amount if present, else a status mark. */
function coverageCellContent(cell: CoverageCell | undefined, lang: Lang): Content {
  const base = { fontSize: 8, alignment: 'center' as const };
  if (!cell) return { text: '—', color: '#bbb', ...base };

  const limit = cell.limit ? t(cell.limit, lang) : '';
  if (limit && cell.status !== 'no') return { text: limit, color: '#333', ...base };

  switch (cell.status) {
    case 'yes':
      return svgCheck('#1a7f37');
    case 'partial':
      return svgCheck('#b35900');
    case 'no':
      return { text: '', ...base };
    default:
      return { text: '—', color: '#bbb', ...base }; // unknown
  }
}

/**
 * The coverage matrix: rows = normalized risks, columns = insurers, cells = ✔ / amount /
 * blank. A bold premium row (taken from the offers, the single source of truth for price)
 * is appended at the bottom, matching the reference layout.
 */
function coverageMatrixTable(result: ComparisonResult, lang: Lang, L: Record<string, string>): Content | null {
  const matrix = result.coverageMatrix;
  if (!matrix || matrix.rows.length === 0) return null;

  // Column order: the matrix's own insurer list, falling back to the offers order.
  const columns = matrix.insurers.length ? matrix.insurers : result.offers.map((o) => o.insurer);
  const headFill = '#0b3d91';

  const headerRow: Content[] = [
    { text: L.coverageCol, bold: true, color: 'white', fillColor: headFill, fontSize: 9 },
    ...columns.map((c) => ({ text: c, bold: true, color: 'white', fillColor: headFill, fontSize: 9, alignment: 'center' as const })),
  ];

  const bodyRows: Content[][] = matrix.rows.map((row) => {
    const byInsurer = new Map(row.cells.map((c) => [normName(c.insurer), c]));
    return [
      { text: t(row.risk, lang), fontSize: 8 },
      ...columns.map((col) => coverageCellContent(byInsurer.get(normName(col)), lang)),
    ];
  });

  // Premium row, mapped from the offers by insurer name.
  const offerByInsurer = new Map(result.offers.map((o) => [normName(o.insurer), o]));
  const premiumFill = '#eef4ff';
  const premiumRow: Content[] = [
    { text: L.premiumRow, bold: true, fontSize: 9, fillColor: premiumFill },
    ...columns.map((col) => {
      const o = offerByInsurer.get(normName(col));
      return { text: o ? premiumText(o, L.na) : L.na, bold: true, fontSize: 9, alignment: 'center' as const, fillColor: premiumFill };
    }),
  ];

  return {
    table: {
      headerRows: 1,
      widths: ['*', ...columns.map(() => 'auto')],
      body: [headerRow, ...bodyRows, premiumRow],
    },
    // Zebra striping on body rows; header and premium-row cells set their own fill.
    layout: {
      fillColor: (rowIndex: number) => (rowIndex > 0 && rowIndex % 2 === 0 ? '#f7f9fc' : null),
    },
    margin: [0, 4, 0, 10],
  };
}

function offerDetail(offer: OfferAnalysis, lang: Lang, L: Record<string, string>): Content {
  const head = [offer.insurer, offer.productName].filter(Boolean).join(' — ');
  const meta = `${L.premium}: ${premiumText(offer, L.na)}  •  ${L.score}: ${Math.round(offer.weightedScore)}/100  •  ${L.file}: ${offer.sourceFile}`;

  const keyTerms: Content[] = [];
  const addTerm = (label: string, value: LocalizedText | null) => {
    if (value) keyTerms.push({ text: [{ text: `${label}: `, bold: true }, t(value, lang)], fontSize: 9, margin: [0, 1, 0, 1] });
  };
  addTerm(L.sumInsured, offer.sumInsuredOrLimit);
  addTerm(L.deductible, offer.deductible);
  addTerm(L.assistance, offer.assistance);
  addTerm(L.claims, offer.claimsHandling);
  addTerm(L.payment, offer.paymentOptions);

  // Header + bullet list for a labelled group of localized items (omitted if empty).
  const section = (label: string, items: LocalizedText[], color?: string): Content[] =>
    items.length
      ? [
          { text: label, bold: true, fontSize: 10, color, margin: [0, 4, 0, 0] },
          bulletList(items.map((c) => t(c, lang))),
        ]
      : [];

  return {
    stack: [
      { text: head, bold: true, fontSize: 13, margin: [0, 8, 0, 1] },
      { text: meta, fontSize: 8, color: '#666', margin: [0, 0, 0, 4] },
      ...keyTerms,
      ...section(L.coverages, offer.coverages),
      ...section(L.exclusions, offer.exclusions),
      // Plain "+/–/!" prefixes — Roboto has no dingbat glyphs; the color carries the meaning.
      ...section(`+ ${L.strengths}`, offer.strengths, '#1a7f37'),
      ...section(`– ${L.weaknesses}`, offer.weaknesses, '#b35900'),
      ...section(`! ${L.redFlags}`, offer.redFlags, '#c00'),
    ],
    unbreakable: false,
    margin: [0, 0, 0, 6],
  };
}

function buildDocDefinition(
  result: ComparisonResult,
  _profile: ClientProfile | null,
  lang: Lang,
): TDocumentDefinitions {
  const L = LABELS[lang];

  const overviewTable: Content = {
    table: {
      headerRows: 1,
      widths: ['*', 'auto', 'auto', 'auto'],
      body: [
        [
          { text: L.insurer, bold: true, fillColor: '#f0f2f5' },
          { text: L.premium, bold: true, fillColor: '#f0f2f5' },
          { text: L.deductible, bold: true, fillColor: '#f0f2f5' },
          { text: L.score, bold: true, fillColor: '#f0f2f5' },
        ],
        ...result.offers.map((o) => [
          { text: [o.insurer, o.productName ? `\n${o.productName}` : ''].join(''), fontSize: 9 },
          { text: premiumText(o, L.na), fontSize: 9 },
          { text: o.deductible ? t(o.deductible, lang) : '—', fontSize: 9 },
          { text: `${Math.round(o.weightedScore)}/100`, bold: true, fontSize: 9 },
        ]),
      ],
    },
    layout: 'lightHorizontalLines',
    margin: [0, 4, 0, 10],
  };

  const content: Content[] = [
    { text: L.title, fontSize: 20, bold: true, color: '#0b3d91' },
    {
      text: `${L.type}: ${t(result.detectedInsuranceType, lang)}`,
      fontSize: 11,
      color: '#555',
      margin: [0, 2, 0, 10],
    },

    // Executive summary
    { text: L.summary, fontSize: 14, bold: true, margin: [0, 6, 0, 2] },
    {
      table: { widths: ['*'], body: [[{ text: t(result.executiveSummary, lang), fontSize: 11, margin: [6, 6, 6, 6] }]] },
      layout: { defaultBorder: false, fillColor: () => '#eef4ff' },
      margin: [0, 0, 0, 8],
    },
  ];

  if (result.clientNeedsSummary) {
    content.push(
      { text: L.clientNeeds, fontSize: 12, bold: true, margin: [0, 4, 0, 2] },
      { text: t(result.clientNeedsSummary, lang), fontSize: 10, margin: [0, 0, 0, 8] },
    );
  }

  // Three picks side by side
  content.push({
    columns: [
      pickBlock(L.mostAdvantageous, result.winner, lang, '#1a7f37'),
      pickBlock(L.cheapest, result.cheapest, lang, '#0b3d91'),
      pickBlock(L.bestCoverage, result.bestCoverage, lang, '#7a3ea1'),
    ],
    columnGap: 12,
    margin: [0, 4, 0, 12],
  });

  // Insured subject + coverage matrix (the heart of the report)
  content.push(...insuredSubjectBlock(result, lang, L));
  const matrixTable = coverageMatrixTable(result, lang, L);
  if (matrixTable) {
    content.push({ text: L.coverageMatrix, fontSize: 14, bold: true, margin: [0, 6, 0, 2] }, matrixTable);
  }

  // Overview table
  content.push({ text: L.overviewTable, fontSize: 14, bold: true }, overviewTable);

  // Per-offer details
  content.push({ text: L.offerDetails, fontSize: 14, bold: true, margin: [0, 6, 0, 0] });
  for (const offer of result.offers) content.push(offerDetail(offer, lang, L));

  // Similarities / differences / what to watch
  const pushSection = (label: string, items: LocalizedText[]) =>
    content.push(
      { text: label, fontSize: 13, bold: true, margin: [0, 8, 0, 2] },
      bulletList(items.map((s) => t(s, lang))),
    );
  pushSection(L.similarities, result.similarities);
  pushSection(L.differences, result.differences);
  pushSection(L.whatToWatch, result.whatToWatch);

  // Glossary
  if (result.glossary.length) {
    content.push({ text: L.glossary, fontSize: 13, bold: true, margin: [0, 8, 0, 2] });
    content.push({
      ul: result.glossary.map((g) => ({
        text: [{ text: `${t(g.term, lang)}: `, bold: true }, t(g.definition, lang)],
        fontSize: 9,
        margin: [0, 1, 0, 1],
      })),
    });
  }

  // Disclaimers
  if (result.disclaimers.length) {
    content.push(
      { text: L.disclaimers, fontSize: 11, bold: true, margin: [0, 10, 0, 2] },
      {
        ul: result.disclaimers.map((d) => t(d, lang)),
        fontSize: 8,
        italics: true,
        color: '#777',
      },
    );
  }

  return {
    content,
    defaultStyle: { font: 'Roboto', fontSize: 10, lineHeight: 1.15 },
    pageMargins: [40, 40, 40, 50],
    footer: (currentPage: number, pageCount: number) => ({
      text: `${currentPage} / ${pageCount}`,
      alignment: 'center',
      fontSize: 8,
      color: '#999',
      margin: [0, 10, 0, 0],
    }),
  };
}

/** Render a ComparisonResult into a styled PDF (Bulgarian by default). */
export async function renderComparisonPdf(
  result: ComparisonResult,
  profile: ClientProfile | null,
  lang: Lang = 'bg',
): Promise<RenderedPdf> {
  const docDefinition = buildDocDefinition(result, profile, lang);
  const buffer: Buffer = await pdfmake.createPdf(docDefinition).getBuffer();
  return {
    buffer,
    filename: `insurance-comparison-${lang}.pdf`,
    dataUrl: `data:application/pdf;base64,${buffer.toString('base64')}`,
  };
}
