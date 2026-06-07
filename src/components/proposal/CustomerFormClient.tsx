'use client';

import { useCallback, useState } from 'react';
import { cx } from '@/components/i18n';
import type { PropertyProposal } from '@/mastra/schemas/proposal';
import type { Provider } from '@/fill/registry';
import { PROPOSAL_UI, type Lang } from './i18n';
import { ProposalForm } from './ProposalForm';

/** Customer side of the shared form: loads via token, autosaves and submits. */
export function CustomerFormClient({
  token,
  providers,
  initialAnswers,
  initialSubmitted,
}: {
  token: string;
  providers: Provider[];
  initialAnswers: PropertyProposal;
  initialSubmitted: boolean;
}) {
  const [lang, setLang] = useState<Lang>('bg');
  const [submitted, setSubmitted] = useState(initialSubmitted);
  const [submitting, setSubmitting] = useState(false);
  const t = PROPOSAL_UI[lang];

  const persist = useCallback(
    async (answers: PropertyProposal, submit: boolean) => {
      await fetch(`/api/form/${token}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ answers, submit }),
      });
    },
    [token],
  );

  const onAutosave = useCallback((answers: PropertyProposal) => void persist(answers, false), [persist]);
  const onSubmit = useCallback(
    async (answers: PropertyProposal) => {
      setSubmitting(true);
      try {
        await persist(answers, true);
        setSubmitted(true);
      } finally {
        setSubmitting(false);
      }
    },
    [persist],
  );

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-6 flex justify-end">
        <div className="inline-flex rounded-lg border border-zinc-300 p-0.5 dark:border-zinc-700">
          {(['bg', 'en'] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={cx(
                'rounded-md px-3 py-1 text-sm font-semibold uppercase transition-colors',
                lang === l ? 'bg-indigo-600 text-white' : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800',
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <ProposalForm
        initialAnswers={initialAnswers}
        lang={lang}
        providers={providers}
        onAutosave={onAutosave}
        onSubmit={onSubmit}
        submitting={submitting}
        submitted={submitted}
      />

      {!submitted && <p className="mt-4 text-center text-xs text-zinc-400">{t.saving.replace('…', '')} · {t.saved}</p>}
    </div>
  );
}
