'use client';

import { useEffect, useState } from 'react';
import { cx } from '@/components/i18n';
import { PROPOSAL_UI, type Lang } from './i18n';

/** Read-only customer link with copy-to-clipboard + open. */
export function ShareLink({ token, lang }: { token: string; lang: Lang }) {
  const t = PROPOSAL_UI[lang];
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState(false);
  // window.location is browser-only, so read it once after mount.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setOrigin(window.location.origin), []);
  const url = `${origin}/form/${token}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — the input is still selectable */
    }
  }

  return (
    <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 dark:border-indigo-900 dark:bg-indigo-950/30">
      <h3 className="text-sm font-semibold text-indigo-900 dark:text-indigo-200">{t.shareTitle}</h3>
      <p className="mt-1 text-xs text-indigo-700/80 dark:text-indigo-300/80">{t.shareHint}</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 truncate rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-zinc-700 dark:border-indigo-900 dark:bg-zinc-900 dark:text-zinc-200"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={copy}
            className={cx(
              'shrink-0 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors',
              copied ? 'bg-emerald-600' : 'bg-indigo-600 hover:bg-indigo-700',
            )}
          >
            {copied ? t.copied : t.copyLink}
          </button>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 rounded-lg border border-indigo-300 px-4 py-2 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-100 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-950/50"
          >
            {t.openForm}
          </a>
        </div>
      </div>
    </div>
  );
}
