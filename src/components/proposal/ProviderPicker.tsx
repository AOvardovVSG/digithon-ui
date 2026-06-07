'use client';

import { cx } from '@/components/i18n';
import { type Provider, isProviderReady } from '@/fill/registry';
import { PROPOSAL_UI, type Lang } from './i18n';
import { ProviderLogo } from './ProviderLogo';

/** A grid of provider logos with a "cool checkbox" multi-select interaction. */
export function ProviderPicker({
  providers,
  selected,
  onChange,
  lang,
  disabled,
}: {
  providers: Provider[];
  selected: string[];
  onChange: (next: string[]) => void;
  lang: Lang;
  disabled?: boolean;
}) {
  const t = PROPOSAL_UI[lang];
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {providers.map((p) => {
        const active = selected.includes(p.id);
        const ready = isProviderReady(p.id);
        return (
          <button
            key={p.id}
            type="button"
            disabled={disabled}
            onClick={() => toggle(p.id)}
            aria-pressed={active}
            className={cx(
              'group relative flex h-24 items-center justify-center rounded-2xl border bg-white p-3 transition-all dark:bg-zinc-900',
              active
                ? 'border-transparent shadow-md ring-2'
                : 'border-zinc-200 hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:hover:border-zinc-700',
              disabled && 'cursor-not-allowed opacity-60',
            )}
            style={active ? ({ '--tw-ring-color': p.accent } as React.CSSProperties) : undefined}
          >
            <ProviderLogo provider={p} className="max-h-12 w-full" />

            {/* selection check */}
            <span
              className={cx(
                'absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full text-white transition-all',
                active ? 'scale-100 opacity-100' : 'scale-50 opacity-0',
              )}
              style={{ backgroundColor: p.accent }}
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
                <path d="M5 12l4.5 4.5L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>

            {!ready && (
              <span className="absolute bottom-1.5 left-1.5 rounded-full bg-zinc-100 px-1.5 py-0.5 text-[9px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                {t.notReady}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
