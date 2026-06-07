/**
 * Static registry of insurance lines and providers for the proposal-filling feature.
 * Pure data (no fs / server imports) so it is safe to import from client components.
 *
 * The PDF templates + extracted field maps live under `public/templates/<line>/<id>/`
 * and are produced offline by `scripts/prepare-templates.py`. A provider is only
 * fillable once an adapter exists for it — see `ADAPTER_READY`.
 */

export interface Provider {
  id: string;
  /** Brand name — not translated. */
  name: string;
  /** Accent colour used for the selection ring and the text-badge logo fallback. */
  accent: string;
  /** Path under /public to the logo SVG (falls back to a styled badge if missing). */
  logo: string;
}

export interface InsuranceLine {
  id: string;
  label: { bg: string; en: string };
  description: { bg: string; en: string };
  /** Inactive lines render as "coming soon" — only property-fire ships today. */
  active: boolean;
  providers: Provider[];
}

const PROPERTY_FIRE_PROVIDERS: Provider[] = [
  { id: 'allianz', name: 'Allianz', accent: '#003781', logo: '/providers/allianz.svg' },
  { id: 'armeec', name: 'Armeec', accent: '#e2001a', logo: '/providers/armeec.svg' },
  { id: 'axiom', name: 'Axiom', accent: '#0f4c81', logo: '/providers/axiom.svg' },
  { id: 'bulgaria-insurance', name: 'Bulgaria Insurance', accent: '#c8102e', logo: '/providers/bulgaria-insurance.svg' },
  { id: 'bulstrad', name: 'Bulstrad VIG', accent: '#003da5', logo: '/providers/bulstrad.svg' },
  { id: 'groupama', name: 'Groupama', accent: '#00964f', logo: '/providers/groupama.svg' },
  { id: 'ozk', name: 'OZK Insurance', accent: '#00529b', logo: '/providers/ozk.svg' },
  { id: 'uniqa', name: 'UNIQA', accent: '#003e7e', logo: '/providers/uniqa.svg' },
];

export const INSURANCE_LINES: InsuranceLine[] = [
  {
    id: 'property-fire',
    label: { bg: 'Имущество / Индустриален пожар', en: 'Property / Industrial fire' },
    description: {
      bg: 'Застраховка на имущество за юридически лица (пожар, природни бедствия и др.).',
      en: 'Business property insurance (fire, natural disasters and more).',
    },
    active: true,
    providers: PROPERTY_FIRE_PROVIDERS,
  },
  {
    id: 'motor-casco',
    label: { bg: 'Автокаско', en: 'Motor Casco' },
    description: { bg: 'Скоро.', en: 'Coming soon.' },
    active: false,
    providers: [],
  },
  {
    id: 'health',
    label: { bg: 'Здравна застраховка', en: 'Health insurance' },
    description: { bg: 'Скоро.', en: 'Coming soon.' },
    active: false,
    providers: [],
  },
];

/** Provider ids that have a hand-authored adapter and can actually be filled today. */
export const ADAPTER_READY = new Set<string>([
  'allianz',
  'armeec',
  'bulgaria-insurance',
  'bulstrad',
  'groupama',
  'ozk',
  'uniqa',
]);

export function getLine(id: string): InsuranceLine | undefined {
  return INSURANCE_LINES.find((l) => l.id === id);
}

export function getProvider(lineId: string, providerId: string): Provider | undefined {
  return getLine(lineId)?.providers.find((p) => p.id === providerId);
}

export function isProviderReady(id: string): boolean {
  return ADAPTER_READY.has(id);
}
