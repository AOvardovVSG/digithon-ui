import { listCases } from '@/db/cases';
import { CasesClient } from '@/components/proposal/CasesClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default function CasesPage() {
  const cases = listCases();
  return (
    <main className="min-h-full bg-zinc-50 dark:bg-zinc-950">
      <CasesClient initialCases={cases} />
    </main>
  );
}
