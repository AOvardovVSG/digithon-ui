'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { cx } from '@/components/i18n';
import { Spinner } from '@/components/ui';
import type { CaseRow } from '@/db/schema';
import type { PropertyProposal } from '@/mastra/schemas/proposal';
import { SECTIONS, getAnswer, missingRequired, setAnswer } from '@/fill/questionnaire';
import { getLine, getProvider } from '@/fill/registry';
import { PROPOSAL_UI, type Lang, SECTION_TITLES, STATUS_LABELS, STATUS_TONE } from './i18n';
import { ProviderLogo } from './ProviderLogo';
import { QuestionField } from './QuestionField';
import { ShareLink } from './ShareLink';

type FillResult =
  | { providerId: string; filename: string; mimeType: string; dataUrl: string; missingFields: string[] }
  | { providerId: string; error: string };

export function BrokerCaseClient({ initialCase, lang: initialLang }: { initialCase: CaseRow; lang?: Lang }) {
  const [lang, setLang] = useState<Lang>(initialLang ?? 'bg');
  const [answers, setAnswers] = useState<PropertyProposal>(initialCase.answers ?? {});
  const [status, setStatus] = useState(initialCase.status);
  const [saved, setSaved] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<FillResult[] | null>(null);
  const [notReady, setNotReady] = useState<string[]>([]);
  const firstRender = useRef(true);
  const t = PROPOSAL_UI[lang];
  const line = getLine(initialCase.insuranceLine);

  const missing = useMemo(() => new Set(missingRequired(answers)), [answers]);

  // Debounced autosave of broker edits.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setSaved(false);
    const id = setTimeout(async () => {
      await fetch(`/api/cases/${initialCase.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
      setSaved(true);
    }, 700);
    return () => clearTimeout(id);
  }, [answers, initialCase.id]);

  const setField = useCallback((key: string, value: unknown) => setAnswers((prev) => setAnswer(prev, key, value)), []);

  async function generate() {
    setGenerating(true);
    try {
      // Make sure the latest edits are saved before filling.
      await fetch(`/api/cases/${initialCase.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
      const res = await fetch(`/api/cases/${initialCase.id}/fill`, { method: 'POST' });
      const json = await res.json();
      setResults(json.results as FillResult[]);
      setNotReady((json.notReady as string[]) ?? []);
      setStatus('completed');
    } finally {
      setGenerating(false);
    }
  }

  const ok = results?.filter((r): r is Extract<FillResult, { dataUrl: string }> => 'dataUrl' in r) ?? [];

  function downloadAll() {
    ok.forEach((r, i) => {
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = r.dataUrl;
        a.download = r.filename;
        a.click();
      }, i * 250);
    });
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-10">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link href="/cases" className="text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100">
          {t.backToCases}
        </Link>
        <div className="inline-flex rounded-lg border border-zinc-300 p-0.5 dark:border-zinc-700">
          {(['bg', 'en'] as const).map((l) => (
            <button key={l} type="button" onClick={() => setLang(l)} className={cx('rounded-md px-3 py-1 text-sm font-semibold uppercase', lang === l ? 'bg-indigo-600 text-white' : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800')}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{initialCase.label || line?.label[lang]}</h1>
        <span className={cx('rounded-full px-2.5 py-1 text-[11px] font-semibold', STATUS_TONE[status])}>{STATUS_LABELS[lang][status]}</span>
        <span className="text-xs text-zinc-400">{saved ? t.saved : t.saving}</span>
      </div>

      <div className="mb-6">
        <ShareLink token={initialCase.shareToken} lang={lang} />
      </div>

      {/* Missing required */}
      {missing.size > 0 && (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950/30">
          <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">
            {t.missingTitle} ({missing.size})
          </p>
          <p className="mt-1 text-xs text-rose-600/80 dark:text-rose-400/80">{t.brokerEditHint}</p>
        </div>
      )}

      {/* Editor */}
      <div className="flex flex-col gap-4">
        {SECTIONS.map((s) => {
          const visible = s.questions.filter((q) => (q.showIf ? q.showIf(answers) : true));
          return (
            <section key={s.id} className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-50">{SECTION_TITLES[lang][s.id]}</h2>
              <div className="flex flex-col gap-4">
                {visible.map((q) => (
                  <QuestionField key={q.key} q={q} value={getAnswer(answers, q.key)} onChange={(v) => setField(q.key, v)} lang={lang} highlight={missing.has(q.key)} />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* Generate */}
      <div className="sticky bottom-4 z-10 mt-6">
        <button
          type="button"
          onClick={generate}
          disabled={generating}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg transition-colors hover:bg-indigo-700 disabled:opacity-60"
        >
          {generating && <Spinner className="h-5 w-5" />}
          {generating ? t.generating : results ? t.regenerate : t.generate}
        </button>
      </div>

      {/* Downloads */}
      {results && (
        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{t.downloads}</h2>
            {ok.length > 1 && (
              <button type="button" onClick={downloadAll} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
                {t.downloadAll}
              </button>
            )}
          </div>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[...results, ...notReady.map((providerId) => ({ providerId, notReady: true }) as const)].map((r) => {
              const p = getProvider(initialCase.insuranceLine, r.providerId);
              const filled = 'dataUrl' in r;
              return (
                <li key={r.providerId} className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex min-w-0 items-center gap-3">
                    {p && (
                      <span className="grid h-9 w-16 shrink-0 place-items-center rounded-md border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-950">
                        <ProviderLogo provider={p} className="max-h-6 w-full" />
                      </span>
                    )}
                    <span className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">{p?.name ?? r.providerId}</span>
                  </div>
                  {filled ? (
                    <a
                      href={(r as Extract<FillResult, { dataUrl: string }>).dataUrl}
                      download={(r as Extract<FillResult, { dataUrl: string }>).filename}
                      className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
                    >
                      {t.download}
                    </a>
                  ) : (
                    <span className="shrink-0 text-xs text-zinc-400">{'notReady' in r ? t.notReadyNote : t.fillError}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
