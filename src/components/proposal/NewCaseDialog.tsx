'use client';

import { useState } from 'react';
import { cx } from '@/components/i18n';
import { inputClass } from '@/components/ui';
import { Spinner } from '@/components/ui';
import { INSURANCE_LINES } from '@/fill/registry';
import type { CaseRow } from '@/db/schema';
import { PROPOSAL_UI, type Lang } from './i18n';
import { ProviderPicker } from './ProviderPicker';

/** Modal: pick insurance line + providers + label, then create a case. */
export function NewCaseDialog({
  open,
  onClose,
  onCreated,
  lang,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (created: CaseRow) => void;
  lang: Lang;
}) {
  const t = PROPOSAL_UI[lang];
  const [lineId, setLineId] = useState('property-fire');
  const [providers, setProviders] = useState<string[]>([]);
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;
  const line = INSURANCE_LINES.find((l) => l.id === lineId);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ insuranceLine: lineId, providers, label: label.trim() || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || t.genericError);
      onCreated(json.case as CaseRow);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.genericError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-zinc-900/50 p-4 backdrop-blur-sm sm:p-8">
      <div className="my-auto w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{t.newCase}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label={t.cancel}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* 1 · line */}
        <p className="mt-5 text-sm font-semibold text-zinc-800 dark:text-zinc-100">{t.selectLine}</p>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {INSURANCE_LINES.map((l) => {
            const active = l.id === lineId;
            return (
              <button
                key={l.id}
                type="button"
                disabled={!l.active}
                onClick={() => {
                  setLineId(l.id);
                  setProviders([]);
                }}
                className={cx(
                  'rounded-xl border p-3 text-left text-sm transition-colors',
                  !l.active && 'cursor-not-allowed opacity-50',
                  active
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40'
                    : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-800',
                )}
              >
                <span className="font-medium text-zinc-800 dark:text-zinc-100">{l.label[lang]}</span>
                {!l.active && <span className="mt-1 block text-[11px] text-zinc-400">{t.comingSoon}</span>}
              </button>
            );
          })}
        </div>

        {/* 2 · providers */}
        <p className="mt-5 text-sm font-semibold text-zinc-800 dark:text-zinc-100">{t.selectProviders}</p>
        <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">{t.selectProvidersHint}</p>
        {line && <ProviderPicker providers={line.providers} selected={providers} onChange={setProviders} lang={lang} disabled={busy} />}

        {/* label */}
        <div className="mt-5">
          <label htmlFor="case-label" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {t.caseLabel}
          </label>
          <input id="case-label" className={cx(inputClass, 'mt-1.5')} placeholder={t.caseLabelPlaceholder} value={label} disabled={busy} onChange={(e) => setLabel(e.target.value)} />
        </div>

        {error && <p className="mt-3 text-sm font-medium text-rose-600 dark:text-rose-400">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
            {t.cancel}
          </button>
          <button
            type="button"
            onClick={create}
            disabled={busy || providers.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy && <Spinner className="h-4 w-4" />}
            {busy ? t.creating : t.create}
          </button>
        </div>
      </div>
    </div>
  );
}
