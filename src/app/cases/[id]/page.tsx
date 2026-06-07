import { notFound } from 'next/navigation';
import { getCase } from '@/db/cases';
import { BrokerCaseClient } from '@/components/proposal/BrokerCaseClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function CaseDetailPage({ params }: PageProps<'/cases/[id]'>) {
  const { id } = await params;
  const found = getCase(id);
  if (!found) notFound();
  return (
    <main className="min-h-full bg-zinc-50 dark:bg-zinc-950">
      <BrokerCaseClient initialCase={found} />
    </main>
  );
}
