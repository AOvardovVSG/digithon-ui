'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { cx } from '@/components/i18n';
import { Spinner } from '@/components/ui';
import type { PropertyProposal } from '@/mastra/schemas/proposal';
import { SECTIONS, type Section, answeredCount, getAnswer, setAnswer } from '@/fill/questionnaire';
import { PROPOSAL_UI, type Lang, Q_LABELS, SECTION_TITLES, optLabel } from './i18n';
import { ProviderLogo } from './ProviderLogo';
import { QuestionField } from './QuestionField';
import type { Provider } from '@/fill/registry';

type Step = { kind: 'intro' } | { kind: 'section'; section: Section } | { kind: 'review' };

function formatValue(lang: Lang, type: string, value: unknown): string {
  const t = PROPOSAL_UI[lang];
  if (value == null || value === '') return '—';
  if (type === 'boolean') return value ? t.yes : t.no;
  if (type === 'yesno') return value === 'yes' ? t.yes : t.no;
  if (type === 'single') return optLabel(lang, String(value));
  if (type === 'multi' && Array.isArray(value)) return value.map((v) => optLabel(lang, String(v))).join(', ');
  if (typeof value === 'number') return value.toLocaleString('bg-BG');
  return String(value);
}

export function ProposalForm({
  initialAnswers,
  lang,
  providers = [],
  onAutosave,
  onSubmit,
  submitting,
  submitted,
}: {
  initialAnswers: PropertyProposal;
  lang: Lang;
  providers?: Provider[];
  onAutosave?: (answers: PropertyProposal) => void;
  onSubmit: (answers: PropertyProposal) => void | Promise<void>;
  submitting?: boolean;
  submitted?: boolean;
}) {
  const t = PROPOSAL_UI[lang];
  const [answers, setAnswers] = useState<PropertyProposal>(initialAnswers);
  const [stepIdx, setStepIdx] = useState(0);
  const topRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  const steps: Step[] = useMemo(
    () => [{ kind: 'intro' }, ...SECTIONS.map((s) => ({ kind: 'section' as const, section: s })), { kind: 'review' }],
    [],
  );
  const step = steps[stepIdx];

  // Debounced autosave whenever answers change.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (!onAutosave) return;
    const id = setTimeout(() => onAutosave(answers), 800);
    return () => clearTimeout(id);
  }, [answers, onAutosave]);

  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [stepIdx]);

  const setField = (key: string, value: unknown) => setAnswers((prev) => setAnswer(prev, key, value));
  const { answered, total } = answeredCount(answers);
  const pct = total ? Math.round((answered / total) * 100) : 0;

  if (submitted) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-emerald-200 bg-emerald-50 px-6 py-14 text-center dark:border-emerald-900 dark:bg-emerald-950/40">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-emerald-600 text-white">
          <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
            <path d="M5 12l4.5 4.5L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-emerald-800 dark:text-emerald-200">{t.submittedTitle}</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-emerald-700 dark:text-emerald-300">{t.submittedHint}</p>
      </div>
    );
  }

  return (
    <div ref={topRef} className="mx-auto w-full max-w-xl scroll-mt-6">
      {/* Progress */}
      <div className="mb-5">
        <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
          <span>{step.kind === 'section' ? SECTION_TITLES[lang][step.section.id] : step.kind === 'review' ? t.reviewTitle : ''}</span>
          <span>
            {answered} {t.progressOf} {total}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div className="h-full rounded-full bg-indigo-600 transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7 dark:border-zinc-800 dark:bg-zinc-900">
        {step.kind === 'intro' && (
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{t.formGreeting}</h1>
            <p className="mx-auto mt-2 max-w-md text-sm text-zinc-600 dark:text-zinc-400">{t.formIntro}</p>
            {providers.length > 0 && (
              <div className="mt-6">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">{t.forProviders}</p>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                  {providers.map((p) => (
                    <div key={p.id} className="grid h-12 w-24 place-items-center rounded-xl border border-zinc-200 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-950">
                      <ProviderLogo provider={p} className="max-h-8 w-full" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {step.kind === 'section' && (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{SECTION_TITLES[lang][step.section.id]}</h2>
            {step.section.questions
              .filter((q) => (q.showIf ? q.showIf(answers) : true))
              .map((q) => (
                <QuestionField key={q.key} q={q} value={getAnswer(answers, q.key)} onChange={(v) => setField(q.key, v)} lang={lang} />
              ))}
          </div>
        )}

        {step.kind === 'review' && (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{t.reviewTitle}</h2>
            <dl className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {SECTIONS.flatMap((s) => s.questions)
                .filter((q) => (q.showIf ? q.showIf(answers) : true))
                .map((q) => {
                  const v = getAnswer(answers, q.key);
                  const has = !(v == null || v === '' || (Array.isArray(v) && v.length === 0));
                  return (
                    <div key={q.key} className="flex items-start justify-between gap-4 py-2 text-sm">
                      <dt className="text-zinc-500 dark:text-zinc-400">{Q_LABELS[lang][q.key] ?? q.key}</dt>
                      <dd className={cx('max-w-[55%] text-right font-medium', has ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 italic')}>
                        {has ? formatValue(lang, q.type, v) : t.notAnswered}
                      </dd>
                    </div>
                  );
                })}
            </dl>
          </div>
        )}
      </div>

      {/* Footer nav */}
      <div className="mt-5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
          disabled={stepIdx === 0 || submitting}
          className="rounded-xl border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {t.back}
        </button>

        {step.kind === 'review' ? (
          <button
            type="button"
            onClick={() => onSubmit(answers)}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-60"
          >
            {submitting && <Spinner className="h-4 w-4" />}
            {submitting ? t.submitting : t.submit}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setStepIdx((i) => Math.min(steps.length - 1, i + 1))}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
          >
            {stepIdx === 0 ? t.start : stepIdx === steps.length - 2 ? t.finish : t.next}
          </button>
        )}
      </div>
    </div>
  );
}
