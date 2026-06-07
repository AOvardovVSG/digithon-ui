import { desc, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { PropertyProposal } from '@/mastra/schemas/proposal';
import { db } from './index';
import { type CaseRow, type CaseStatus, cases } from './schema';

/** Data-access helpers for cases. Server-only (imported by route handlers / RSCs). */

export function listCases(): CaseRow[] {
  return db.select().from(cases).orderBy(desc(cases.updatedAt)).all();
}

export function getCase(id: string): CaseRow | undefined {
  return db.select().from(cases).where(eq(cases.id, id)).get();
}

export function getCaseByToken(token: string): CaseRow | undefined {
  return db.select().from(cases).where(eq(cases.shareToken, token)).get();
}

export function createCase(input: {
  insuranceLine: string;
  providers: string[];
  label?: string | null;
}): CaseRow {
  const id = nanoid(12);
  const shareToken = nanoid(24);
  db.insert(cases)
    .values({
      id,
      shareToken,
      insuranceLine: input.insuranceLine,
      providers: input.providers,
      label: input.label ?? null,
      status: 'draft',
      answers: {},
    })
    .run();
  return getCase(id)!;
}

export function updateCase(
  id: string,
  patch: {
    answers?: PropertyProposal;
    providers?: string[];
    label?: string | null;
    status?: CaseStatus;
    submittedAt?: Date;
  },
): CaseRow | undefined {
  const set: Partial<CaseRow> = { updatedAt: new Date() };
  if (patch.answers !== undefined) set.answers = patch.answers;
  if (patch.providers !== undefined) set.providers = patch.providers;
  if (patch.label !== undefined) set.label = patch.label;
  if (patch.status !== undefined) set.status = patch.status;
  if (patch.submittedAt !== undefined) set.submittedAt = patch.submittedAt;
  db.update(cases).set(set).where(eq(cases.id, id)).run();
  return getCase(id);
}
