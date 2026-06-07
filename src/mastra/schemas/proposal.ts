import { z } from 'zod';

/**
 * Canonical "property / industrial-fire" proposal — the single questionnaire whose
 * answers feed every insurer's PDF. Field meanings are the union of the common data the
 * 8 provider questionnaires collect (insured party, property characteristics, security &
 * fire protection, risk questions, requested coverages, sum insured).
 *
 * Everything is optional: the customer fills what they can via the shared link, the broker
 * completes/edits the rest, and adapters stamp whatever is present. Keys and enum *values*
 * are language-neutral (English); user-facing labels live in the questionnaire i18n.
 */

const YesNo = z.enum(['yes', 'no']);
export type YesNo = z.infer<typeof YesNo>;

export const PaymentMethod = z.enum(['once', 'two', 'four']);
export const UsedBy = z.enum(['owner', 'tenant', 'other']);
export const BuildingType = z.enum(['administrative', 'production', 'commercial', 'storage', 'other']);
export const LocatedOn = z.enum(['floor', 'ground', 'basement', 'whole']);
export const Construction = z.enum(['reinforced_concrete', 'brick', 'metal', 'wood', 'other']);
export const RoofConstruction = z.enum(['reinforced_concrete', 'tiles', 'metal', 'wood', 'other']);
export const Glazing = z.enum(['single', 'double']);
export const SecurityFeature = z.enum(['sot', 'local_alarm', 'armed_guard', 'cctv', 'guard_24h']);
export const FireMeasure = z.enum(['sprinkler', 'extinguishers', 'fire_alarm', 'extra_water']);
export const DayOccupancy = z.enum(['working_hours', 'around_the_clock']);
export const YearOccupancy = z.enum(['year_round', 'seasonal']);
export const Currency = z.enum(['BGN', 'EUR']);
export const SumBasis = z.enum(['actual', 'reinstatement', 'agreed', 'other']);

/** A person/company party to the contract (insured, or insuring party/beneficiary). */
export const PartySchema = z.object({
  name: z.string().nullish().describe('Three names (individual) or company name.'),
  idNumber: z.string().nullish().describe('ЕГН (personal) or ЕИК/BULSTAT (company).'),
  regAddress: z.string().nullish().describe('Registered address.'),
  corrAddress: z.string().nullish().describe('Correspondence address, if different.'),
  phone: z.string().nullish(),
  email: z.string().nullish(),
});
export type Party = z.infer<typeof PartySchema>;

export const PropertyProposalSchema = z.object({
  // — Insured party (Застрахован) —
  insured: PartySchema.nullish(),

  // — Insuring party / beneficiary (Застраховащ/Бенефициент), when different —
  hasInsuringParty: z.boolean().nullish().describe('True when the insuring party/beneficiary differs.'),
  insuringParty: PartySchema.nullish(),

  // — Policy terms —
  paymentMethod: PaymentMethod.nullish().describe('Premium payment schedule.'),
  startDate: z.string().nullish().describe('Policy start (ISO date or DD/MM/YYYY).'),
  endDate: z.string().nullish().describe('Policy end.'),
  termMonths: z.number().nullish().describe('Policy term in months (default 12).'),
  currency: Currency.nullish(),

  // — Insured property (Имущество) —
  propertyAddress: z.string().nullish().describe('Address of the insured property.'),
  activity: z.string().nullish().describe('Business activity carried out (Предмет на дейност).'),
  staffCount: z.number().nullish(),
  usedBy: UsedBy.nullish().describe('The building is used by owner/tenant/other.'),
  buildingType: BuildingType.nullish(),
  commissioned: YesNo.nullish().describe('Building put into operation (въведена в експлоатация).'),
  yearBuilt: z.number().nullish(),
  floors: z.number().nullish().describe('Number of floors.'),
  areaSqm: z.number().nullish().describe('Total floor area to insure, in m².'),
  locatedOn: LocatedOn.nullish().describe('Where within the building the property sits.'),
  wallConstruction: Construction.nullish(),
  roofConstruction: RoofConstruction.nullish(),
  glazing: Glazing.nullish(),
  security: z.array(SecurityFeature).nullish().describe('Security measures present.'),
  fireMeasures: z.array(FireMeasure).nullish().describe('Fire-protection measures present.'),
  dayOccupancy: DayOccupancy.nullish(),
  yearOccupancy: YearOccupancy.nullish(),

  // — Risk questions (yes/no, several with details) —
  nearWater: YesNo.nullish().describe('Water body (river/dam/lake) within ~1 km.'),
  landslideZone: YesNo.nullish(),
  hasDefects: YesNo.nullish().describe('Unrepaired defects of the property.'),
  defectsDetails: z.string().nullish(),
  storesFlammable: YesNo.nullish().describe('Flammable/explosive materials stored on site.'),
  stockBelow10cm: YesNo.nullish().describe('Stock placed < 10 cm from the floor.'),
  lossesLast3Years: YesNo.nullish().describe('Claims/losses in the last 3 years.'),
  lossesDetails: z.string().nullish(),
  insuredElsewhere: YesNo.nullish().describe('Property currently insured with another insurer.'),
  insuredElsewhereDetails: z.string().nullish(),
  otherFacts: z.string().nullish().describe('Other material facts for risk assessment.'),

  // — Requested coverages (Покрития) —
  coverages: z
    .object({
      fire: z.boolean().nullish().describe('A — fire/explosion/lightning/aircraft (mandatory).'),
      naturalDisasters: z.boolean().nullish().describe('Б1 — natural disasters.'),
      frost: z.boolean().nullish().describe('Б2 — frost.'),
      waterDamage: z.boolean().nullish().describe('Б3 — water damage / pipe burst.'),
      vehicleImpact: z.boolean().nullish().describe('Б4 — impact by vehicle/animal.'),
      earthquake: z.boolean().nullish().describe('Б5 — earthquake.'),
      maliciousActs: z.boolean().nullish().describe('Б6 — malicious acts by third parties.'),
      burglary: z.boolean().nullish().describe('Д1 — burglary/robbery.'),
      shortCircuit: z.boolean().nullish().describe('Д2 — short circuit / power surge.'),
      glassBreakage: z.boolean().nullish().describe('Д3 — glass breakage.'),
      liability: z.boolean().nullish().describe('Д6 — third-party liability.'),
    })
    .nullish(),
  glassLimit: z.string().nullish().describe('Sub-limit for glass breakage (Д3).'),
  liabilityLimit: z.string().nullish().describe('Sub-limit for third-party liability (Д6).'),

  // — Sum insured (Застрахователна сума) —
  sumBasis: SumBasis.nullish().describe('Basis for the sum insured.'),
  totalSum: z.number().nullish().describe('Total sum insured.'),
});

export type PropertyProposal = z.infer<typeof PropertyProposalSchema>;

/** An empty proposal — the starting point for both customer and broker forms. */
export const emptyProposal: PropertyProposal = {};
