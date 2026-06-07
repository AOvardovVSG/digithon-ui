'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cx } from '@/components/i18n';
import { PROPOSAL_UI, type Lang } from './i18n';

/** Slim top navigation shared by the broker-facing pages. Hidden on the customer form. */
export function SiteNav({ lang = 'bg' }: { lang?: Lang }) {
  const pathname = usePathname() || '/';
  if (pathname.startsWith('/form/')) return null;
  const t = PROPOSAL_UI[lang];

  const links = [
    { href: '/', label: t.navCompare, active: pathname === '/' },
    { href: '/cases', label: t.navCases, active: pathname.startsWith('/cases') },
  ];

  return (
    <nav className="sticky top-0 z-30 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-1 px-4">
        <Link href="/cases" className="mr-3 flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-50">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-indigo-600 text-sm text-white">IB</span>
          <span className="hidden sm:inline">{t.brand}</span>
        </Link>
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={cx(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              l.active
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
                : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800',
            )}
          >
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
