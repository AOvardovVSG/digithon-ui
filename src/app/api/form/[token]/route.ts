import { z } from 'zod';
import { getCaseByToken, updateCase } from '@/db/cases';
import { getLine } from '@/fill/registry';
import { PropertyProposalSchema } from '@/mastra/schemas/proposal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SubmitSchema = z.object({
  answers: PropertyProposalSchema,
  /** When true, mark the case as customer-submitted; autosaves pass false. */
  submit: z.boolean().optional(),
});

/** Customer-facing view of a case — no internal id, just what the form needs. */
function publicView(c: NonNullable<ReturnType<typeof getCaseByToken>>) {
  const line = getLine(c.insuranceLine);
  return {
    insuranceLine: c.insuranceLine,
    lineLabel: line?.label ?? null,
    providers:
      line?.providers
        .filter((p) => c.providers.includes(p.id))
        .map((p) => ({ id: p.id, name: p.name, accent: p.accent, logo: p.logo })) ?? [],
    answers: c.answers ?? {},
    status: c.status,
    label: c.label,
  };
}

/** GET /api/form/[token] — load the shared form for the customer. */
export async function GET(_req: Request, ctx: RouteContext<'/api/form/[token]'>) {
  const { token } = await ctx.params;
  const found = getCaseByToken(token);
  if (!found) return Response.json({ error: 'Формулярът не е намерен.' }, { status: 404 });

  // First time the customer opens it, advance the lifecycle.
  if (found.status === 'draft') {
    updateCase(found.id, { status: 'awaiting_customer' });
    found.status = 'awaiting_customer';
  }

  return Response.json(publicView(found));
}

/** PUT /api/form/[token] — customer saves / submits their answers. */
export async function PUT(req: Request, ctx: RouteContext<'/api/form/[token]'>) {
  const { token } = await ctx.params;
  const found = getCaseByToken(token);
  if (!found) return Response.json({ error: 'Формулярът не е намерен.' }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Невалиден JSON.' }, { status: 400 });
  }
  const parsed = SubmitSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Невалидни данни.', details: parsed.error.flatten() }, { status: 400 });
  }

  updateCase(found.id, {
    answers: parsed.data.answers,
    ...(parsed.data.submit
      ? { status: 'customer_filled', submittedAt: new Date() }
      : found.status === 'draft'
        ? { status: 'awaiting_customer' }
        : {}),
  });

  return Response.json({ ok: true });
}
