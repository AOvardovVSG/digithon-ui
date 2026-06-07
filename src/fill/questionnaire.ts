import {
  BuildingType,
  Construction,
  Currency,
  DayOccupancy,
  FireMeasure,
  Glazing,
  LocatedOn,
  PaymentMethod,
  type PropertyProposal,
  RoofConstruction,
  SecurityFeature,
  SumBasis,
  UsedBy,
  YearOccupancy,
} from '@/mastra/schemas/proposal';

/** Input widget for a question. Labels/options text live in the i18n dictionary. */
export type FieldType =
  | 'text'
  | 'textarea'
  | 'email'
  | 'tel'
  | 'number'
  | 'money'
  | 'date'
  | 'single' // one enum value (radio / segmented)
  | 'multi' // array of enum values (checkbox group)
  | 'yesno' // 'yes' | 'no' (YesNo enum) — segmented control
  | 'boolean'; // true | false — switch toggle

export interface Question {
  /** Dot-path into PropertyProposal, e.g. "insured.name" or "coverages.fire". */
  key: string;
  type: FieldType;
  /** Enum values for `single` / `multi`. */
  options?: readonly string[];
  /** Counts toward completion when true. */
  required?: boolean;
  /** Only shown when this predicate passes (e.g. detail fields). */
  showIf?: (p: PropertyProposal) => boolean;
}

export interface Section {
  id: string;
  questions: Question[];
}

// ---- dot-path get/set over a (partial) proposal ----------------------------------------

export function getAnswer(p: PropertyProposal, key: string): unknown {
  return key.split('.').reduce<unknown>((acc, k) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[k];
    return undefined;
  }, p);
}

/** Immutably set a (possibly nested) value; setting null/undefined/'' clears it. */
export function setAnswer(p: PropertyProposal, key: string, value: unknown): PropertyProposal {
  const parts = key.split('.');
  const clone = structuredClone(p) as Record<string, unknown>;
  let node = clone;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    if (!node[k] || typeof node[k] !== 'object') node[k] = {};
    node = node[k] as Record<string, unknown>;
  }
  const last = parts[parts.length - 1];
  const empty = value == null || value === '' || (Array.isArray(value) && value.length === 0);
  if (empty) delete node[last];
  else node[last] = value;
  return clone as PropertyProposal;
}

const yes = (p: PropertyProposal, key: string) => getAnswer(p, key) === 'yes';
const truthy = (p: PropertyProposal, key: string) => Boolean(getAnswer(p, key));

// ---- the questionnaire ------------------------------------------------------------------

export const SECTIONS: Section[] = [
  {
    id: 'insured',
    questions: [
      { key: 'insured.name', type: 'text', required: true },
      { key: 'insured.idNumber', type: 'text', required: true },
      { key: 'insured.regAddress', type: 'text', required: true },
      { key: 'insured.corrAddress', type: 'text' },
      { key: 'insured.phone', type: 'tel' },
      { key: 'insured.email', type: 'email' },
    ],
  },
  {
    id: 'insuring-party',
    questions: [
      { key: 'hasInsuringParty', type: 'boolean' },
      { key: 'insuringParty.name', type: 'text', showIf: (p) => truthy(p, 'hasInsuringParty') },
      { key: 'insuringParty.idNumber', type: 'text', showIf: (p) => truthy(p, 'hasInsuringParty') },
      { key: 'insuringParty.regAddress', type: 'text', showIf: (p) => truthy(p, 'hasInsuringParty') },
    ],
  },
  {
    id: 'property',
    questions: [
      { key: 'propertyAddress', type: 'text', required: true },
      { key: 'activity', type: 'text', required: true },
      { key: 'staffCount', type: 'number' },
      { key: 'usedBy', type: 'single', options: UsedBy.options },
      { key: 'buildingType', type: 'single', options: BuildingType.options, required: true },
      { key: 'commissioned', type: 'yesno' },
      { key: 'yearBuilt', type: 'number' },
      { key: 'floors', type: 'number' },
      { key: 'areaSqm', type: 'number' },
      { key: 'locatedOn', type: 'single', options: LocatedOn.options },
    ],
  },
  {
    id: 'construction',
    questions: [
      { key: 'wallConstruction', type: 'single', options: Construction.options },
      { key: 'roofConstruction', type: 'single', options: RoofConstruction.options },
      { key: 'glazing', type: 'single', options: Glazing.options },
    ],
  },
  {
    id: 'protection',
    questions: [
      { key: 'security', type: 'multi', options: SecurityFeature.options },
      { key: 'fireMeasures', type: 'multi', options: FireMeasure.options },
      { key: 'dayOccupancy', type: 'single', options: DayOccupancy.options },
      { key: 'yearOccupancy', type: 'single', options: YearOccupancy.options },
    ],
  },
  {
    id: 'risk',
    questions: [
      { key: 'nearWater', type: 'yesno' },
      { key: 'landslideZone', type: 'yesno' },
      { key: 'hasDefects', type: 'yesno' },
      { key: 'defectsDetails', type: 'textarea', showIf: (p) => yes(p, 'hasDefects') },
      { key: 'storesFlammable', type: 'yesno' },
      { key: 'stockBelow10cm', type: 'yesno' },
      { key: 'lossesLast3Years', type: 'yesno' },
      { key: 'lossesDetails', type: 'textarea', showIf: (p) => yes(p, 'lossesLast3Years') },
      { key: 'insuredElsewhere', type: 'yesno' },
      { key: 'insuredElsewhereDetails', type: 'textarea', showIf: (p) => yes(p, 'insuredElsewhere') },
      { key: 'otherFacts', type: 'textarea' },
    ],
  },
  {
    id: 'coverages',
    questions: [
      { key: 'coverages.fire', type: 'boolean', required: true },
      { key: 'coverages.naturalDisasters', type: 'boolean' },
      { key: 'coverages.frost', type: 'boolean' },
      { key: 'coverages.waterDamage', type: 'boolean' },
      { key: 'coverages.vehicleImpact', type: 'boolean' },
      { key: 'coverages.earthquake', type: 'boolean' },
      { key: 'coverages.maliciousActs', type: 'boolean' },
      { key: 'coverages.burglary', type: 'boolean' },
      { key: 'coverages.shortCircuit', type: 'boolean' },
      { key: 'coverages.glassBreakage', type: 'boolean' },
      { key: 'glassLimit', type: 'money', showIf: (p) => truthy(p, 'coverages.glassBreakage') },
      { key: 'coverages.liability', type: 'boolean' },
      { key: 'liabilityLimit', type: 'money', showIf: (p) => truthy(p, 'coverages.liability') },
    ],
  },
  {
    id: 'sum-payment',
    questions: [
      { key: 'sumBasis', type: 'single', options: SumBasis.options, required: true },
      { key: 'totalSum', type: 'number', required: true },
      { key: 'currency', type: 'single', options: Currency.options, required: true },
      { key: 'paymentMethod', type: 'single', options: PaymentMethod.options },
      { key: 'startDate', type: 'date' },
      { key: 'endDate', type: 'date' },
    ],
  },
];

export const ALL_QUESTIONS: Question[] = SECTIONS.flatMap((s) => s.questions);

/** Required keys that are still empty for the given proposal (drives broker highlights). */
export function missingRequired(p: PropertyProposal): string[] {
  return ALL_QUESTIONS.filter((q) => q.required && (q.showIf ? q.showIf(p) : true))
    .map((q) => q.key)
    .filter((key) => {
      const v = getAnswer(p, key);
      return v == null || v === '' || (Array.isArray(v) && v.length === 0);
    });
}

/** Count of answered questions among those currently visible (for progress UI). */
export function answeredCount(p: PropertyProposal): { answered: number; total: number } {
  const visible = ALL_QUESTIONS.filter((q) => (q.showIf ? q.showIf(p) : true));
  const answered = visible.filter((q) => {
    const v = getAnswer(p, q.key);
    return !(v == null || v === '' || (Array.isArray(v) && v.length === 0));
  }).length;
  return { answered, total: visible.length };
}
