import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type { PropertyProposal } from '@/mastra/schemas/proposal';

/**
 * Lifecycle of a proposal case:
 *   draft             — broker created it (line + providers), not shared yet
 *   awaiting_customer — share link sent, waiting on the customer
 *   customer_filled   — customer submitted their answers
 *   completed         — broker finalised and generated the provider PDFs
 */
export type CaseStatus = 'draft' | 'awaiting_customer' | 'customer_filled' | 'completed';

/** One proposal case = one customer's questionnaire shared toward N provider PDFs. */
export const cases = sqliteTable('cases', {
  id: text('id').primaryKey(),
  /** Unguessable token in the customer's shareable link (/form/<token>). */
  shareToken: text('share_token').notNull().unique(),
  insuranceLine: text('insurance_line').notNull(),
  /** Selected provider ids, e.g. ["allianz","uniqa"]. */
  providers: text('providers', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
  /** The shared (partial) questionnaire answers. */
  answers: text('answers', { mode: 'json' }).$type<PropertyProposal>().notNull().default(sql`'{}'`),
  status: text('status').$type<CaseStatus>().notNull().default('draft'),
  /** Broker's label for the case (customer/company name) — for the dashboard. */
  label: text('label'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
  submittedAt: integer('submitted_at', { mode: 'timestamp_ms' }),
});

export type CaseRow = typeof cases.$inferSelect;
export type NewCaseRow = typeof cases.$inferInsert;
