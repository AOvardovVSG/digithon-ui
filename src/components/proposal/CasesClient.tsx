'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cx } from '@/components/i18n';
import type { CaseRow } from '@/db/schema';
import { getLine, getProvider } from '@/fill/registry';
import { PROPOSAL_UI, type Lang, STATUS_LABELS, STATUS_TONE } from './i18n';
import { NewCaseDialog } from './NewCaseDialog';
import { ProviderLogo } from './ProviderLogo';

function formatDate(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  return d.toLocaleDateString('bg-BG', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function CasesClient({ initialCases, lang: initialLang }: { initialCases: CaseRow[]; lang?: Lang }) {
  const [lang, setLang] = useState<Lang>(initialLang ?? 'bg');
  const [dialog, setDialog] = useState(false);
  const router = useRouter();
  const t = PROPOSAL_UI[lang];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">{t.casesTitle}</h1>
          <p className="mt-2 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">{t.casesSubtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-lg border border-zinc-300 p-0.5 dark:border-zinc-700">
            {(['bg', 'en'] as const).map((l) => (
              <button key={l} type="button" onClick={() => setLang(l)} className={cx('rounded-md px-3 py-1 text-sm font-semibold uppercase', lang === l ? 'bg-indigo-600 text-white' : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800')}>
                {l}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setDialog(true)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>
            {t.newCase}
          </button>
        </div>
      </header>

      {initialCases.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-zinc-300 px-6 py-16 text-center dark:border-zinc-700">
          <p className="text-base font-semibold text-zinc-700 dark:text-zinc-200">{t.noCases}</p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t.noCasesHint}</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {initialCases.map((c) => {
            const line = getLine(c.insuranceLine);
            return (
              <li key={c.id}>
                <Link
                  href={`/cases/${c.id}`}
                  className="flex h-full flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-colors hover:border-indigo-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-800"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-zinc-900 dark:text-zinc-50">{c.label || line?.label[lang] || c.insuranceLine}</p>
                      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        {t.updated} {formatDate(c.updatedAt)}
                      </p>
                    </div>
                    <span className={cx('shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold', STATUS_TONE[c.status])}>{STATUS_LABELS[lang][c.status]}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {c.providers.slice(0, 5).map((pid) => {
                      const p = getProvider(c.insuranceLine, pid);
                      if (!p) return null;
                      return (
                        <span key={pid} className="grid h-8 w-14 place-items-center rounded-md border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-950">
                          <ProviderLogo provider={p} className="max-h-5 w-full" />
                        </span>
                      );
                    })}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <NewCaseDialog open={dialog} onClose={() => setDialog(false)} onCreated={(created) => router.push(`/cases/${created.id}`)} lang={lang} />
    </div>
  );
}
