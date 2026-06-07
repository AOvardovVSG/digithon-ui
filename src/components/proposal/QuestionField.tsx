'use client';

import { cx } from '@/components/i18n';
import { inputClass } from '@/components/ui';
import type { Question } from '@/fill/questionnaire';
import { PROPOSAL_UI, type Lang, Q_LABELS, optLabel } from './i18n';

interface Props {
  q: Question;
  value: unknown;
  onChange: (value: unknown) => void;
  lang: Lang;
  disabled?: boolean;
  /** Mark as a missing required field. */
  highlight?: boolean;
}

function Chip({
  active,
  onClick,
  children,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cx(
        'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors disabled:opacity-50',
        active
          ? 'border-indigo-500 bg-indigo-600 text-white shadow-sm'
          : 'border-zinc-300 bg-white text-zinc-700 hover:border-indigo-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300',
      )}
    >
      {children}
    </button>
  );
}

export function QuestionField({ q, value, onChange, lang, disabled, highlight }: Props) {
  const t = PROPOSAL_UI[lang];
  const label = Q_LABELS[lang][q.key] ?? q.key;
  const labelEl = (
    <span className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
      {label}
      {q.required && <span className="text-rose-500">*</span>}
    </span>
  );

  // boolean → switch with the label on the same row (coverages, hasInsuringParty)
  if (q.type === 'boolean') {
    const on = value === true;
    return (
      <div
        className={cx(
          'flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5',
          highlight ? 'border-rose-300 dark:border-rose-800' : 'border-zinc-200 dark:border-zinc-800',
        )}
      >
        {labelEl}
        <button
          type="button"
          role="switch"
          aria-checked={on}
          disabled={disabled}
          onClick={() => onChange(on ? false : true)}
          className={cx(
            'relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50',
            on ? 'bg-indigo-600' : 'bg-zinc-300 dark:bg-zinc-700',
          )}
        >
          <span
            className={cx(
              'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all',
              on ? 'left-[22px]' : 'left-0.5',
            )}
          />
        </button>
      </div>
    );
  }

  const field = (() => {
    switch (q.type) {
      case 'yesno':
        return (
          <div className="inline-flex gap-2">
            {(['yes', 'no'] as const).map((v) => (
              <Chip key={v} active={value === v} disabled={disabled} onClick={() => onChange(value === v ? undefined : v)}>
                {v === 'yes' ? t.yes : t.no}
              </Chip>
            ))}
          </div>
        );

      case 'single':
        return (
          <div className="flex flex-wrap gap-2">
            {q.options?.map((opt) => (
              <Chip key={opt} active={value === opt} disabled={disabled} onClick={() => onChange(value === opt ? undefined : opt)}>
                {optLabel(lang, opt)}
              </Chip>
            ))}
          </div>
        );

      case 'multi': {
        const arr = Array.isArray(value) ? (value as string[]) : [];
        return (
          <div className="flex flex-wrap gap-2">
            {q.options?.map((opt) => {
              const active = arr.includes(opt);
              return (
                <Chip
                  key={opt}
                  active={active}
                  disabled={disabled}
                  onClick={() => onChange(active ? arr.filter((x) => x !== opt) : [...arr, opt])}
                >
                  {optLabel(lang, opt)}
                </Chip>
              );
            })}
          </div>
        );
      }

      case 'textarea':
        return (
          <textarea
            rows={2}
            className={inputClass}
            disabled={disabled}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            inputMode="decimal"
            className={inputClass}
            disabled={disabled}
            value={value == null ? '' : String(value)}
            onChange={(e) => {
              const n = e.target.value === '' ? undefined : Number(e.target.value);
              onChange(n != null && Number.isFinite(n) ? n : undefined);
            }}
          />
        );

      case 'date':
        return (
          <input
            type="text"
            inputMode="numeric"
            placeholder={lang === 'bg' ? 'ДД/ММ/ГГГГ' : 'DD/MM/YYYY'}
            className={inputClass}
            disabled={disabled}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
          />
        );

      default:
        // text | email | tel | money
        return (
          <input
            type={q.type === 'email' ? 'email' : q.type === 'tel' ? 'tel' : 'text'}
            inputMode={q.type === 'money' ? 'decimal' : undefined}
            className={inputClass}
            disabled={disabled}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
          />
        );
    }
  })();

  return (
    <div className={cx('flex flex-col gap-1.5', highlight && 'rounded-xl ring-2 ring-rose-200 ring-offset-2 dark:ring-rose-900 dark:ring-offset-zinc-950')}>
      {labelEl}
      {field}
    </div>
  );
}
