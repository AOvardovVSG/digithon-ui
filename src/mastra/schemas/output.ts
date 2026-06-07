import { z } from 'zod';

/**
 * The agent's structured output.
 *
 * IMPORTANT: OpenAI Structured Outputs does not allow `.optional()` fields — every
 * field must be present. For a "missing" value use `.nullable()`, not `.optional()`.
 * We also avoid `.min()/.max()` numeric constraints, since some are not supported by
 * OpenAI's json_schema.
 *
 * Every user-facing TEXT field is bilingual ({ bg, en }) so the UI can render either
 * language. Identifiers and numbers (insurer name, filename, premium, scores) are
 * single-valued and not translated.
 */

/** A bilingual string: Bulgarian + English versions of the same user-facing text. */
export const LocalizedTextSchema = z.object({
  bg: z.string().describe('Bulgarian text.'),
  en: z.string().describe('English translation of the same text.'),
});

/** Scores 0–100 for each dimension of the weighted evaluation framework. */
export const DimensionScoresSchema = z.object({
  coverage: z.number().describe('Coverage breadth & adequacy (weight 30%). 0–100.'),
  price: z.number().describe('Price vs coverage — value for money (weight 25%). 0–100.'),
  exclusions: z.number().describe('Fewer exclusions/limitations = higher score (weight 12%). 0–100.'),
  deductible: z.number().describe('Deductible/franchise — more favorable = higher score (weight 10%). 0–100.'),
  claimsHandling: z.number().describe('Claims settlement & handling quality (weight 10%). 0–100.'),
  assistance: z.number().describe('Assistance & added services (weight 5%). 0–100.'),
  reliability: z.number().describe('Insurer reliability & financial stability (weight 5%). 0–100.'),
  flexibility: z.number().describe('Flexibility — installments, discounts (weight 3%). 0–100.'),
});

/** Analysis of a single offer. */
export const OfferAnalysisSchema = z.object({
  insurer: z.string().describe('Insurer (company) name. Not translated.'),
  productName: z.string().nullable().describe('Insurance product/policy name, if stated. Not translated.'),
  sourceFile: z.string().describe('The filename this offer was extracted from.'),
  annualPremium: z.number().nullable().describe('Annual premium as a number (in `currency`). null if missing.'),
  currency: z.string().describe('Premium currency, e.g. "BGN" or "EUR".'),
  paymentOptions: LocalizedTextSchema.nullable().describe('Payment method / installment options.'),
  sumInsuredOrLimit: LocalizedTextSchema.nullable().describe('Sum insured / limit of liability.'),
  deductible: LocalizedTextSchema.nullable().describe('Deductible/franchise (amount and which risks).'),
  coverages: z.array(LocalizedTextSchema).describe('Main covered risks/coverages.'),
  exclusions: z.array(LocalizedTextSchema).describe('Main exclusions (what is NOT covered).'),
  assistance: LocalizedTextSchema.nullable().describe('Assistance / added services (roadside, repatriation, etc.).'),
  claimsHandling: LocalizedTextSchema.nullable().describe('Claims settlement (authorized garage, expert valuation, timelines).'),
  strengths: z.array(LocalizedTextSchema).describe('Strengths of the offer, in plain language.'),
  weaknesses: z.array(LocalizedTextSchema).describe('Weaknesses of the offer, in plain language.'),
  redFlags: z.array(LocalizedTextSchema).describe('Red flags — risks and pitfalls the client should watch for.'),
  scores: DimensionScoresSchema,
  weightedScore: z.number().describe('Overall weighted score 0–100 per the framework.'),
});

/** A named pick (winner / cheapest / best coverage). */
export const NamedPickSchema = z.object({
  insurer: z.string().describe('Insurer of the picked offer. Not translated.'),
  sourceFile: z.string().describe('File of the picked offer.'),
  reason: LocalizedTextSchema.describe('Short explanation of why this offer is picked.'),
});

export const GlossaryItemSchema = z.object({
  term: LocalizedTextSchema.describe('Insurance term.'),
  definition: LocalizedTextSchema.describe('Plain-language explanation of the term.'),
});

export const ComparisonResultSchema = z.object({
  detectedInsuranceType: LocalizedTextSchema.describe('Detected insurance type, e.g. bg "Автокаско" / en "Motor Casco".'),
  clientNeedsSummary: LocalizedTextSchema
    .nullable()
    .describe("Short summary of the client's demands & needs (if a profile was provided)."),
  executiveSummary: LocalizedTextSchema.describe('Short summary / recommendation (TL;DR), 2–4 sentences.'),
  offers: z.array(OfferAnalysisSchema).describe('Per-offer analysis.'),
  similarities: z.array(LocalizedTextSchema).describe('Similarities across the offers.'),
  differences: z.array(LocalizedTextSchema).describe('Key differences across the offers.'),
  winner: NamedPickSchema.describe('The winning offer — best and most advantageous for the client (best price/coverage balance).'),
  cheapest: NamedPickSchema.describe('The cheapest offer (may differ from the winner).'),
  bestCoverage: NamedPickSchema.describe('The offer with the most complete coverage (may differ from the winner).'),
  recommendation: z.object({
    pick: z.string().describe('Recommended insurer name. Not translated.'),
    rationale: LocalizedTextSchema.describe("Rationale tied to the client's specific needs."),
  }),
  whatToWatch: z.array(LocalizedTextSchema).describe('What the client should pay attention to before signing.'),
  glossary: z.array(GlossaryItemSchema).describe('Glossary of used terms in plain language.'),
  disclaimers: z.array(LocalizedTextSchema).describe('Mandatory disclaimers (informational only, final decision is the client\'s, etc.).'),
});

export type LocalizedText = z.infer<typeof LocalizedTextSchema>;
export type DimensionScores = z.infer<typeof DimensionScoresSchema>;
export type OfferAnalysis = z.infer<typeof OfferAnalysisSchema>;
export type NamedPick = z.infer<typeof NamedPickSchema>;
export type GlossaryItem = z.infer<typeof GlossaryItemSchema>;
export type ComparisonResult = z.infer<typeof ComparisonResultSchema>;

/** Supported render/output languages. */
export type Lang = 'bg' | 'en';
