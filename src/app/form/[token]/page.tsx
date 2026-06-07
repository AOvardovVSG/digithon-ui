import { notFound } from 'next/navigation';
import { getCaseByToken, updateCase } from '@/db/cases';
import { getLine } from '@/fill/registry';
import { CustomerFormClient } from '@/components/proposal/CustomerFormClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function CustomerFormPage({ params }: PageProps<'/form/[token]'>) {
  const { token } = await params;
  const found = getCaseByToken(token);
  if (!found) notFound();

  // Advance the lifecycle the first time the customer opens the link.
  if (found.status === 'draft') updateCase(found.id, { status: 'awaiting_customer' });

  const line = getLine(found.insuranceLine);
  const providers = line?.providers.filter((p) => found.providers.includes(p.id)) ?? [];
  const submitted = found.status === 'customer_filled' || found.status === 'completed';

  return (
    <main className="min-h-full bg-zinc-50 px-4 py-8 sm:py-14 dark:bg-zinc-950">
      <CustomerFormClient token={token} providers={providers} initialAnswers={found.answers ?? {}} initialSubmitted={submitted} />
    </main>
  );
}
