import { z } from 'zod';

/**
 * Client profile — "demands & needs" in the sense of the Bulgarian Insurance Code / IDD.
 * Optional: if not provided, the agent performs an objective best-practice comparison.
 */
export const ClientProfileSchema = z.object({
  insuranceTypeHint: z
    .string()
    .nullable()
    .describe('Hint about the insurance type, if known (e.g. "Автокаско").'),
  budgetMaxAnnual: z.number().nullable().describe('Maximum annual premium budget.'),
  currency: z.string().nullable().describe('Budget currency, e.g. "BGN".'),
  priorities: z
    .array(z.string())
    .nullable()
    .describe('Client priorities, e.g. ["low price", "full coverage", "fast claims"].'),
  riskAppetite: z
    .enum(['low', 'medium', 'high'])
    .nullable()
    .describe('Risk/deductible tolerance: low | medium | high.'),
  subjectDetails: z
    .string()
    .nullable()
    .describe('Details about the insured subject — car (make, year, value), property, person, etc.'),
  currentInsurer: z.string().nullable().describe('Current insurer, if any.'),
  notes: z.string().nullable().describe('Additional notes from the broker/client.'),
});

export type ClientProfile = z.infer<typeof ClientProfileSchema>;

/** Metadata for one uploaded file (the bytes are handled separately). */
export const InputFileMetaSchema = z.object({
  filename: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number(),
});

export type InputFileMeta = z.infer<typeof InputFileMetaSchema>;

/** Structured analysis input: the files (offers) + an optional client profile. */
export const AnalysisInputSchema = z.object({
  files: z
    .array(InputFileMetaSchema)
    .min(2, 'Нужни са поне 2 оферти (файла) за сравнение.'),
  clientProfile: ClientProfileSchema.nullable(),
});

export type AnalysisInput = z.infer<typeof AnalysisInputSchema>;
