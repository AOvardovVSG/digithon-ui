'use client';

import { useEffect, useRef, useState } from 'react';
import { cx } from '@/components/i18n';
import type { Provider } from '@/fill/registry';

/**
 * Renders a provider's SVG logo, falling back to a clean accent-coloured wordmark badge
 * when the file is missing — so the picker always looks finished even before real logos
 * are dropped into /public/providers.
 */
export function ProviderLogo({ provider, className }: { provider: Provider; className?: string }) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  // The 404 can fire before hydration (so onError is missed) — re-check after mount.
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);

  if (failed) {
    return (
      <div
        className={cx('flex items-center justify-center px-2 text-center', className)}
        style={{ color: provider.accent }}
      >
        <span className="text-[15px] leading-tight font-extrabold tracking-tight">{provider.name}</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={provider.logo}
      alt={provider.name}
      onError={() => setFailed(true)}
      className={cx('object-contain', className)}
    />
  );
}
