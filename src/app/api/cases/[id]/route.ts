import { z } from 'zod';
import { getCase, updateCase } from '@/db/cases';
import { PropertyProposalSchema } from '@/mastra/schemas/proposal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PatchSchema = z.object({
  answers: PropertyProposalSchema.optional(),
  providers: z.array(z.string()).optional(),
  label: z.string().trim().max(200).nullable().optional(),
  status: z.enum(['draft', 'awaiting_customer', 'customer_filled', 'completed']).optional(),
});

/** GET /api/cases/[id] — full case for the broker. */
export async function GET(_req: Request, ctx: RouteContext<'/api/cases/[id]'>) {
  const { id } = await ctx.params;
  const found = getCase(id);
  if (!found) return Response.json({ error: 'Случаят не е намерен.' }, { status: 404 });
  return Response.json({ case: found });
}

/** PATCH /api/cases/[id] — broker edits answers / providers / label / status. */
export async function PATCH(req: Request, ctx: RouteContext<'/api/cases/[id]'>) {
  const { id } = await ctx.params;
  if (!getCase(id)) return Response.json({ error: 'Случаят не е намерен.' }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Невалиден JSON.' }, { status: 400 });
  }
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Невалидни данни.', details: parsed.error.flatten() }, { status: 400 });
  }

  const updated = updateCase(id, parsed.data);
  return Response.json({ case: updated });
}
