/**
 * Offline smoke test for the provider-fill engine: fills the ready providers with a
 * representative sample proposal, writes the PDFs to ./out, and reports any fields the
 * adapter referenced that don't exist in the template. Run: `bun run scripts/smoke-fill.ts`.
 *
 * Verify alignment by opening the produced PDFs (or rendering them to PNG with poppler).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import type { PropertyProposal } from '@/mastra/schemas/proposal';
import { ADAPTERS } from '@/fill/adapters';
import { fillProvider } from '@/fill/fill-pdf';

const sample: PropertyProposal = {
  insured: {
    name: 'Примерна Компания ЕООД',
    idNumber: '203012345',
    regAddress: 'гр. София 1000, бул. Витоша № 15',
    phone: '+359 888 123 456',
    email: 'office@primer.bg',
  },
  hasInsuringParty: true,
  insuringParty: { name: 'Банка ДСК ЕАД', idNumber: '121830616', regAddress: 'гр. София, ул. Московска 19' },
  paymentMethod: 'four',
  startDate: '01/07/2026',
  endDate: '30/06/2027',
  termMonths: 12,
  currency: 'BGN',
  propertyAddress: 'гр. Пловдив, ул. Индустриална № 8',
  activity: 'Производство на опаковки',
  staffCount: 45,
  usedBy: 'owner',
  buildingType: 'production',
  commissioned: 'yes',
  yearBuilt: 2012,
  floors: 3,
  areaSqm: 2400,
  locatedOn: 'whole',
  wallConstruction: 'reinforced_concrete',
  roofConstruction: 'metal',
  glazing: 'double',
  security: ['sot', 'cctv', 'guard_24h'],
  fireMeasures: ['sprinkler', 'extinguishers', 'fire_alarm'],
  dayOccupancy: 'around_the_clock',
  yearOccupancy: 'year_round',
  nearWater: 'no',
  landslideZone: 'no',
  hasDefects: 'no',
  storesFlammable: 'yes',
  stockBelow10cm: 'no',
  lossesLast3Years: 'yes',
  lossesDetails: 'Наводнение през 2024 г., щета ~12 000 лв.',
  insuredElsewhere: 'no',
  otherFacts: 'Обектът е с непрекъсната охрана и СОТ.',
  coverages: { fire: true, naturalDisasters: true, earthquake: true, glassBreakage: true, liability: true },
  glassLimit: '20 000',
  liabilityLimit: '50 000',
  sumBasis: 'reinstatement',
  totalSum: 1500000,
};

mkdirSync('out', { recursive: true });
for (const id of Object.keys(ADAPTERS)) {
  const filled = await fillProvider(id, sample);
  const b64 = filled.dataUrl.split(',')[1];
  const path = `out/fill-${id}.pdf`;
  writeFileSync(path, Buffer.from(b64, 'base64'));
  const miss = filled.missingFields;
  console.log(`✓ ${id.padEnd(20)} -> ${path}${miss.length ? `  ⚠ missing fields: ${miss.join(', ')}` : ''}`);
}
console.log('done.');
