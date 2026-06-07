/**
 * Offline smoke test for the parts that do NOT need an OpenAI key:
 *   1. PDF rendering (incl. Bulgarian/Cyrillic) from a sample ComparisonResult.
 *   2. XLSX parsing via the document-parsing module.
 *
 * Run: bun run scripts/smoke.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import * as XLSX from 'xlsx';
import { fileToContentParts } from '../src/mastra/lib/document-parsing';
import { renderComparisonPdf } from '../src/mastra/lib/report-pdf';
import { ComparisonResultSchema, type ComparisonResult, type LocalizedText } from '../src/mastra/schemas/output';

const L = (bg: string, en: string): LocalizedText => ({ bg, en });

const sample: ComparisonResult = {
  detectedInsuranceType: L('Автокаско (КАСКО)', 'Motor Casco'),
  clientNeedsSummary: L(
    'Клиентът кара нов автомобил на лизинг и иска пълно покритие с ремонт в оторизиран сервиз.',
    'The client drives a new leased car and wants full coverage with repair in an authorized garage.',
  ),
  executiveSummary: L(
    'Препоръчваме оферта „Алфа Каско Пълно". Тя не е най-евтината, но дава ремонт в доверен сервиз и без самоучастие за стъкла — най-добра за нова кола на лизинг.',
    'We recommend "Alpha Casco Full". It is not the cheapest, but offers authorized-garage repair and no glass deductible — best for a new leased car.',
  ),
  offers: [
    {
      insurer: 'Алфа Иншурънс',
      productName: 'Алфа Каско Пълно',
      sourceFile: 'alpha-casco.pdf',
      annualPremium: 1450,
      currency: 'BGN',
      paymentOptions: L('До 4 вноски', 'Up to 4 installments'),
      sumInsuredOrLimit: L('Пазарна стойност на автомобила', 'Market value of the vehicle'),
      deductible: L('Без самоучастие за стъкла', 'No deductible for glass'),
      coverages: [L('ПТП', 'Road accident'), L('Кражба', 'Theft'), L('Природни бедствия', 'Natural disasters')],
      exclusions: [L('Умишлени действия', 'Intentional acts')],
      assistance: L('24/7 пътна помощ, репатриране в ЕС', '24/7 roadside assistance, EU repatriation'),
      claimsHandling: L('Ремонт в оторизиран сервиз', 'Repair in an authorized garage'),
      strengths: [L('Ремонт в доверен сервиз', 'Authorized-garage repair'), L('Пълно покритие', 'Full coverage')],
      weaknesses: [L('По-висока премия', 'Higher premium')],
      redFlags: [],
      scores: { coverage: 92, price: 70, exclusions: 85, deductible: 88, claimsHandling: 90, assistance: 85, reliability: 80, flexibility: 75 },
      weightedScore: 84,
    },
    {
      insurer: 'Бета Застраховане',
      productName: 'Бета Икономично Каско',
      sourceFile: 'beta-casco.xlsx',
      annualPremium: 1100,
      currency: 'BGN',
      paymentOptions: L('Еднократно', 'Single payment'),
      sumInsuredOrLimit: L('Договорена сума', 'Agreed sum'),
      deductible: L('150 лв. самоучастие на щета', 'BGN 150 deductible per claim'),
      coverages: [L('ПТП', 'Road accident'), L('Пожар', 'Fire')],
      exclusions: [L('Кражба на части', 'Theft of parts'), L('Стъкла', 'Glass')],
      assistance: null,
      claimsHandling: L('Обезщетение по експертна оценка', 'Payout by expert valuation'),
      strengths: [L('По-ниска цена', 'Lower price')],
      weaknesses: [L('Без покритие за стъкла', 'No glass coverage'), L('Самоучастие на всяка щета', 'Deductible on every claim')],
      redFlags: [L('Изключена кражба на части', 'Parts theft excluded')],
      scores: { coverage: 60, price: 88, exclusions: 55, deductible: 60, claimsHandling: 62, assistance: 30, reliability: 75, flexibility: 55 },
      weightedScore: 64,
    },
  ],
  similarities: [L('И двете покриват ПТП', 'Both cover road accidents')],
  differences: [L('Само Алфа покрива стъкла и кражба на части', 'Only Alpha covers glass and parts theft')],
  winner: { insurer: 'Алфа Иншурънс', sourceFile: 'alpha-casco.pdf', reason: L('Най-добър баланс за нова кола на лизинг.', 'Best balance for a new leased car.') },
  cheapest: { insurer: 'Бета Застраховане', sourceFile: 'beta-casco.xlsx', reason: L('Най-ниска премия.', 'Lowest premium.') },
  bestCoverage: { insurer: 'Алфа Иншурънс', sourceFile: 'alpha-casco.pdf', reason: L('Най-пълно покритие.', 'Most complete coverage.') },
  recommendation: { pick: 'Алфа Иншурънс', rationale: L('Покритието съответства на нуждите от пълна защита на нов автомобил.', 'Coverage matches the need to fully protect a new vehicle.') },
  whatToWatch: [L('Проверете списъка с доверени сервизи.', 'Check the list of authorized garages.')],
  glossary: [
    { term: L('Самоучастие', 'Deductible'), definition: L('Частта от щетата, която плащате сами.', 'The part of a claim you pay yourself.') },
  ],
  disclaimers: [
    L('Този анализ е информационен и не представлява обвързваща оферта.', 'This analysis is informational and not a binding offer.'),
  ],
};

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
}

async function main() {
  mkdirSync('out', { recursive: true });

  // 0) Schema validity.
  ComparisonResultSchema.parse(sample);
  console.log('✓ Sample conforms to ComparisonResultSchema');

  // 1) PDF rendering (bg + en).
  for (const lang of ['bg', 'en'] as const) {
    const pdf = await renderComparisonPdf(sample, null, lang);
    const head = pdf.buffer.subarray(0, 5).toString('latin1');
    assert(head === '%PDF-', `PDF (${lang}) must start with %PDF- (got "${head}")`);
    assert(pdf.buffer.byteLength > 3000, `PDF (${lang}) seems too small (${pdf.buffer.byteLength} bytes)`);
    writeFileSync(`out/${pdf.filename}`, pdf.buffer);
    console.log(`✓ Rendered out/${pdf.filename} (${pdf.buffer.byteLength} bytes)`);
  }

  // 2) XLSX parsing round-trip.
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['Застраховател', 'Премия'],
    ['Бета Застраховане', 1100],
  ]);
  XLSX.utils.book_append_sheet(wb, ws, 'Оферта');
  const xlsxBytes = new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }));
  const parts = await fileToContentParts({
    filename: 'beta.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    bytes: xlsxBytes,
  });
  const text = parts.map((p) => (p.type === 'text' ? p.text : '')).join('');
  assert(text.includes('Бета Застраховане') && text.includes('1100'), 'XLSX text extraction must contain sheet values');
  console.log('✓ XLSX parsed to CSV text correctly');

  console.log('\nAll smoke checks passed. Open the PDFs in ./out to eyeball the Cyrillic rendering.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
