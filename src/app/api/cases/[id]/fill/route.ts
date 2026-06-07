import { getCase, updateCase } from '@/db/cases';
import { isProviderReady } from '@/fill/registry';
import { fillProviders } from '@/fill/fill-pdf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// PDF generation for several providers can take a moment.
export const maxDuration = 60;

/**
 * POST /api/cases/[id]/fill — generate the pre-filled provider PDFs from the case's
 * stored answers. Returns one entry per selected provider (filled PDF as a data URL, or an
 * error / "not ready" marker). Marks the case completed when at least one PDF is produced.
 */
export async function POST(_req: Request, ctx: RouteContext<'/api/cases/[id]/fill'>) {
  const { id } = await ctx.params;
  const found = getCase(id);
  if (!found) return Response.json({ error: 'Случаят не е намерен.' }, { status: 404 });

  const ready = found.providers.filter(isProviderReady);
  const notReady = found.providers.filter((p) => !isProviderReady(p));

  const results = await fillProviders(ready, found.answers ?? {});
  const produced = results.filter((r) => 'dataUrl' in r).length;

  if (produced > 0 && found.status !== 'completed') {
    updateCase(id, { status: 'completed' });
  }

  return Response.json({ results, notReady });
}
