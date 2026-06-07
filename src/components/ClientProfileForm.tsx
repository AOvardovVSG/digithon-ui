'use client';

import { useState } from 'react';
import type { ClientProfile } from '@/mastra/schemas/input';
import { Field, inputClass } from './ui';
import { cx, INSURANCE_TYPE_SUGGESTIONS, PRIORITY_PRESETS, UI, type Lang } from './i18n';

/** Local, string-friendly mirror of ClientProfileSchema (inputs are easier as strings). */
export interface ProfileState {
  insuranceTypeHint: string;
  budgetMaxAnnual: string;
  currency: string;
  priorities: string[];
  riskAppetite: '' | 'low' | 'medium' | 'high';
  subjectDetails: string;
  currentInsurer: string;
  notes: string;
}

export const emptyProfile: ProfileState = {
  insuranceTypeHint: '',
  budgetMaxAnnual: '',
  currency: 'BGN',
  priorities: [],
  riskAppetite: '',
  subjectDetails: '',
  currentInsurer: '',
  notes: '',
};

/**
 * Convert the form state into a `ClientProfile`, or `null` if the broker left it
 * untouched. Every key is present (with `null` for empties) because the schema's
 * fields are `.nullable()`, not `.optional()`.
 */
export function buildClientProfile(p: ProfileState): ClientProfile | null {
  const budgetNum = p.budgetMaxAnnual.trim() ? Number(p.budgetMaxAnnual) : NaN;
  const budget = Number.isFinite(budgetNum) ? budgetNum : null;

  const profile: ClientProfile = {
    insuranceTypeHint: p.insuranceTypeHint.trim() || null,
    budgetMaxAnnual: budget,
    currency: budget != null ? p.currency : null,
    priorities: p.priorities.length ? p.priorities : null,
    riskAppetite: p.riskAppetite || null,
    subjectDetails: p.subjectDetails.trim() || null,
    currentInsurer: p.currentInsurer.trim() || null,
    notes: p.notes.trim() || null,
  };

  const hasAny = Object.values(profile).some(
    (v) => v !== null && !(Array.isArray(v) && v.length === 0),
  );
  return hasAny ? profile : null;
}

const RISK_LEVELS = ['low', 'medium', 'high'] as const;

export function ClientProfileForm({
  value,
  onChange,
  lang,
  disabled,
}: {
  value: ProfileState;
  onChange: (next: ProfileState) => void;
  lang: Lang;
  disabled?: boolean;
}) {
  const t = UI[lang];
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState('');

  const set = <K extends keyof ProfileState>(key: K, val: ProfileState[K]) =>
    onChange({ ...value, [key]: val });

  function togglePriority(p: string) {
    set(
      'priorities',
      value.priorities.includes(p)
        ? value.priorities.filter((x) => x !== p)
        : [...value.priorities, p],
    );
  }

  function addCustom() {
    const v = custom.trim();
    if (v && !value.priorities.includes(v)) set('priorities', [...value.priorities, v]);
    setCustom('');
  }

  const presets = PRIORITY_PRESETS[lang];
  const riskLabel: Record<(typeof RISK_LEVELS)[number], string> = {
    low: t.riskLow,
    medium: t.riskMedium,
    high: t.riskHigh,
  };

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800">
      {/* Disclosure header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2">
          <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
            {t.profileTitle}
          </span>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            {t.optional}
          </span>
        </span>
        <svg
          className={cx(
            'h-4 w-4 shrink-0 text-zinc-400 transition-transform',
            open && 'rotate-180',
          )}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="flex flex-col gap-4 border-t border-zinc-200 px-4 py-4 dark:border-zinc-800">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.profileHint}</p>

          <Field label={t.insuranceType} htmlFor="insuranceType">
            <input
              id="insuranceType"
              list="insurance-types"
              className={inputClass}
              placeholder={t.insuranceTypePlaceholder}
              value={value.insuranceTypeHint}
              disabled={disabled}
              onChange={(e) => set('insuranceTypeHint', e.target.value)}
            />
            <datalist id="insurance-types">
              {INSURANCE_TYPE_SUGGESTIONS[lang].map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Field label={t.budget} htmlFor="budget">
                <input
                  id="budget"
                  type="number"
                  min="0"
                  inputMode="decimal"
                  className={inputClass}
                  placeholder={t.budgetPlaceholder}
                  value={value.budgetMaxAnnual}
                  disabled={disabled}
                  onChange={(e) => set('budgetMaxAnnual', e.target.value)}
                />
              </Field>
            </div>
            <Field label={t.currency} htmlFor="currency">
              <select
                id="currency"
                className={inputClass}
                value={value.currency}
                disabled={disabled}
                onChange={(e) => set('currency', e.target.value)}
              >
                <option value="BGN">BGN</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </Field>
          </div>

          {/* Priorities */}
          <Field label={t.priorities} hint={t.prioritiesHint}>
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => {
                const active = value.priorities.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    disabled={disabled}
                    onClick={() => togglePriority(p)}
                    className={cx(
                      'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                      active
                        ? 'border-indigo-500 bg-indigo-600 text-white'
                        : 'border-zinc-300 bg-white text-zinc-600 hover:border-indigo-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300',
                    )}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
            {/* Custom priorities not in presets */}
            {value.priorities.filter((p) => !presets.includes(p)).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {value.priorities
                  .filter((p) => !presets.includes(p))
                  .map((p) => (
                    <span
                      key={p}
                      className="inline-flex items-center gap-1 rounded-full border border-indigo-500 bg-indigo-600 px-3 py-1 text-xs font-medium text-white"
                    >
                      {p}
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => togglePriority(p)}
                        aria-label={`${t.remove} ${p}`}
                        className="ml-0.5 opacity-80 hover:opacity-100"
                      >
                        ×
                      </button>
                    </span>
                  ))}
              </div>
            )}
            <div className="mt-2 flex gap-2">
              <input
                className={inputClass}
                placeholder={t.customPriorityPlaceholder}
                value={custom}
                disabled={disabled}
                onChange={(e) => setCustom(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustom();
                  }
                }}
              />
              <button
                type="button"
                disabled={disabled || !custom.trim()}
                onClick={addCustom}
                className="shrink-0 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                {t.add}
              </button>
            </div>
          </Field>

          {/* Risk appetite */}
          <Field label={t.riskAppetite}>
            <div className="inline-flex rounded-lg border border-zinc-300 p-0.5 dark:border-zinc-700">
              {RISK_LEVELS.map((level) => {
                const active = value.riskAppetite === level;
                return (
                  <button
                    key={level}
                    type="button"
                    disabled={disabled}
                    onClick={() => set('riskAppetite', active ? '' : level)}
                    className={cx(
                      'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
                      active
                        ? 'bg-indigo-600 text-white'
                        : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800',
                    )}
                  >
                    {riskLabel[level]}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label={t.subjectDetails} htmlFor="subject">
            <textarea
              id="subject"
              rows={2}
              className={inputClass}
              placeholder={t.subjectPlaceholder}
              value={value.subjectDetails}
              disabled={disabled}
              onChange={(e) => set('subjectDetails', e.target.value)}
            />
          </Field>

          <Field label={t.currentInsurer} htmlFor="currentInsurer">
            <input
              id="currentInsurer"
              className={inputClass}
              placeholder={t.currentInsurerPlaceholder}
              value={value.currentInsurer}
              disabled={disabled}
              onChange={(e) => set('currentInsurer', e.target.value)}
            />
          </Field>

          <Field label={t.notes} htmlFor="notes">
            <textarea
              id="notes"
              rows={2}
              className={inputClass}
              placeholder={t.notesPlaceholder}
              value={value.notes}
              disabled={disabled}
              onChange={(e) => set('notes', e.target.value)}
            />
          </Field>
        </div>
      )}
    </div>
  );
}
