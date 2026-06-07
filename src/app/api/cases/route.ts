import { z } from 'zod';
import { createCase, listCases } from '@/db/cases';
import { getLine } from '@/fill/registry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CreateCaseSchema = z.object({
  insuranceLine: z.string(),
  providers: z.array(z.string()).min(1),
  label: z.string().trim().max(200).optional().nullable(),
});

/** GET /api/cases — list all cases (broker dashboard). */
export async function GET() {
  return Response.json({ cases: listCases() });
}

/** POST /api/cases — create a case (insurance line + selected providers). */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Невалиден JSON.' }, { status: 400 });
  }

  const parsed = CreateCaseSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Невалидни данни.', details: parsed.error.flatten() }, { status: 400 });
  }

  const line = getLine(parsed.data.insuranceLine);
  if (!line || !line.active) {
    return Response.json({ error: 'Непознат или неактивен вид застраховка.' }, { status: 400 });
  }
  const validIds = new Set(line.providers.map((p) => p.id));
  const providers = parsed.data.providers.filter((id) => validIds.has(id));
  if (providers.length === 0) {
    return Response.json({ error: 'Изберете поне един валиден застраховател.' }, { status: 400 });
  }

  const created = createCase({ insuranceLine: line.id, providers, label: parsed.data.label });
  return Response.json({ case: created }, { status: 201 });
}
