'use client';

import { useState } from 'react';
import type {
  ComparisonResult,
  CoverageMatrix,
  CoverageStatus,
  DimensionScores,
  InsuredSubject,
  LocalizedText,
  NamedPick,
  OfferAnalysis,
} from '@/mastra/schemas/output';
import { cx, pick, UI, type Lang } from './i18n';

interface ReportInfo {
  filename: string;
  mimeType: string;
  dataUrl: string;
}

/* ---------- helpers ---------- */

function scoreColor(v: number): { bar: string; text: string } {
  if (v >= 75) return { bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' };
  if (v >= 50) return { bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' };
  return { bar: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400' };
}

function premiumText(offer: OfferAnalysis, lang: Lang, na: string): string {
  if (offer.annualPremium == null) return na;
  const locale = lang === 'bg' ? 'bg-BG' : 'en-US';
  return `${offer.annualPremium.toLocaleString(locale)} ${offer.currency}`;
}

function formatMoney(amount: number | null, currency: string | null, lang: Lang, na: string): string {
  if (amount == null) return na;
  const locale = lang === 'bg' ? 'bg-BG' : 'en-US';
  return `${amount.toLocaleString(locale)}${currency ? ` ${currency}` : ''}`;
}

/* ---------- small presentational pieces ---------- */

function ScoreBar({ label, value }: { label: string; value: number }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const c = scoreColor(v);
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-xs text-zinc-600 dark:text-zinc-400">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div className={cx('h-full rounded-full', c.bar)} style={{ width: `${v}%` }} />
      </div>
      <span className={cx('w-8 shrink-0 text-right text-xs font-semibold tabular-nums', c.text)}>
        {v}
      </span>
    </div>
  );
}

function LocalizedList({
  items,
  lang,
  marker,
  markerColor,
}: {
  items: LocalizedText[];
  lang: Lang;
  marker?: string;
  markerColor?: string;
}) {
  const visible = items.map((i) => pick(i, lang)).filter(Boolean);
  if (visible.length === 0) return null;
  return (
    <ul className="flex flex-col gap-1.5">
      {visible.map((text, i) => (
        <li key={i} className="flex gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <span className={cx('shrink-0 select-none', markerColor ?? 'text-zinc-400')}>
            {marker ?? '•'}
          </span>
          <span>{text}</span>
        </li>
      ))}
    </ul>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{children}</h3>
  );
}

const PICK_STYLES = {
  winner: {
    ring: 'border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40',
    chip: 'bg-emerald-600',
    icon: '🏆',
  },
  cheapest: {
    ring: 'border-sky-300 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/40',
    chip: 'bg-sky-600',
    icon: '💰',
  },
  bestCoverage: {
    ring: 'border-violet-300 bg-violet-50 dark:border-violet-900 dark:bg-violet-950/40',
    chip: 'bg-violet-600',
    icon: '🛡️',
  },
} as const;

function PickCard({
  kind,
  label,
  pick: p,
  lang,
}: {
  kind: keyof typeof PICK_STYLES;
  label: string;
  pick: NamedPick;
  lang: Lang;
}) {
  const s = PICK_STYLES[kind];
  return (
    <div className={cx('flex flex-col gap-2 rounded-2xl border p-4', s.ring)}>
      <span
        className={cx(
          'inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold text-white',
          s.chip,
        )}
      >
        <span aria-hidden="true">{s.icon}</span>
        {label}
      </span>
      <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{p.insurer}</p>
      <p className="text-sm text-zinc-600 dark:text-zinc-300">{pick(p.reason, lang)}</p>
    </div>
  );
}

function KeyTerm({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className="text-sm text-zinc-800 dark:text-zinc-200">{value}</span>
    </div>
  );
}

const COVERAGE_STATUS: Record<
  CoverageStatus,
  { symbol: string; cell: string; labelKey: 'covYes' | 'covNo' | 'covPartial' | 'covUnknown' }
> = {
  yes: {
    symbol: '✓',
    cell: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
    labelKey: 'covYes',
  },
  no: {
    symbol: '✕',
    cell: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
    labelKey: 'covNo',
  },
  partial: {
    symbol: '◐',
    cell: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
    labelKey: 'covPartial',
  },
  unknown: {
    symbol: '–',
    cell: 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500',
    labelKey: 'covUnknown',
  },
};

function CoverageMatrixTable({ matrix, lang }: { matrix: CoverageMatrix; lang: Lang }) {
  const t = UI[lang];
  if (matrix.rows.length === 0 || matrix.insurers.length === 0) return null;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <SectionTitle>{t.coverageMatrixTitle}</SectionTitle>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-500 dark:text-zinc-400">
        {(Object.keys(COVERAGE_STATUS) as CoverageStatus[]).map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span
              className={cx(
                'inline-flex h-5 w-5 items-center justify-center rounded text-[11px] font-bold',
                COVERAGE_STATUS[s].cell,
              )}
            >
              {COVERAGE_STATUS[s].symbol}
            </span>
            {t[COVERAGE_STATUS[s].labelKey]}
          </span>
        ))}
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 min-w-[180px] bg-white p-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                {t.riskColumn}
              </th>
              {matrix.insurers.map((insurer) => (
                <th
                  key={insurer}
                  className="min-w-[110px] p-2 text-center text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                >
                  {insurer}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((row, ri) => {
              const byInsurer = new Map(row.cells.map((c) => [c.insurer, c]));
              return (
                <tr
                  key={ri}
                  className="border-t border-zinc-100 dark:border-zinc-800"
                >
                  <td className="sticky left-0 z-10 bg-white p-2 align-top text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                    {pick(row.risk, lang)}
                  </td>
                  {matrix.insurers.map((insurer) => {
                    const cell = byInsurer.get(insurer);
                    const status = cell?.status ?? 'unknown';
                    const s = COVERAGE_STATUS[status];
                    const limit = cell?.limit ? pick(cell.limit, lang) : '';
                    return (
                      <td key={insurer} className="p-2 text-center align-top">
                        <span
                          className={cx(
                            'inline-flex h-6 w-6 items-center justify-center rounded text-xs font-bold',
                            s.cell,
                          )}
                          title={t[s.labelKey]}
                        >
                          {s.symbol}
                        </span>
                        {limit && (
                          <div className="mt-1 text-[11px] leading-tight text-zinc-500 dark:text-zinc-400">
                            {limit}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InsuredSubjectBlock({ subject, lang }: { subject: InsuredSubject; lang: Lang }) {
  const t = UI[lang];
  if (subject.items.length === 0 && !subject.address) return null;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <SectionTitle>{t.insuredSubjectTitle}</SectionTitle>
      {subject.address && (
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">{t.address}: </span>
          {pick(subject.address, lang)}
        </p>
      )}
      {subject.items.length > 0 && (
        <ul className="mt-3 flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
          {subject.items.map((item, i) => (
            <li key={i} className="flex items-center justify-between gap-4 py-2">
              <span className="text-sm text-zinc-700 dark:text-zinc-300">{pick(item.label, lang)}</span>
              <span className="shrink-0 text-sm font-semibold text-zinc-900 tabular-nums dark:text-zinc-100">
                {formatMoney(item.sumInsured, item.currency, lang, t.na)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function OfferCard({
  offer,
  lang,
  isWinner,
}: {
  offer: OfferAnalysis;
  lang: Lang;
  isWinner: boolean;
}) {
  const t = UI[lang];
  const [showScores, setShowScores] = useState(false);
  const overall = Math.round(offer.weightedScore);
  const c = scoreColor(overall);

  const dims: Array<{ key: keyof DimensionScores; label: string }> = [
    { key: 'coverage', label: t.dimCoverage },
    { key: 'price', label: t.dimPrice },
    { key: 'exclusions', label: t.dimExclusions },
    { key: 'deductible', label: t.dimDeductible },
    { key: 'claimsHandling', label: t.dimClaimsHandling },
    { key: 'assistance', label: t.dimAssistance },
    { key: 'reliability', label: t.dimReliability },
    { key: 'flexibility', label: t.dimFlexibility },
  ];

  return (
    <div
      className={cx(
        'flex flex-col gap-4 rounded-2xl border bg-white p-5 dark:bg-zinc-900',
        isWinner
          ? 'border-emerald-300 ring-1 ring-emerald-200 dark:border-emerald-900 dark:ring-emerald-900'
          : 'border-zinc-200 dark:border-zinc-800',
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="truncate text-lg font-bold text-zinc-900 dark:text-zinc-50">
              {offer.insurer}
            </h4>
            {isWinner && (
              <span className="shrink-0 rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                {t.mostAdvantageous}
              </span>
            )}
          </div>
          {offer.productName && (
            <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">{offer.productName}</p>
          )}
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              {premiumText(offer, lang, t.na)}
            </span>
            <span className="text-zinc-400"> · {t.premium}</span>
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-center">
          <span className={cx('text-2xl font-extrabold tabular-nums', c.text)}>{overall}</span>
          <span className="text-[10px] uppercase tracking-wide text-zinc-400">/ 100</span>
        </div>
      </div>

      {/* Overall score bar */}
      <ScoreBar label={t.overallScore} value={overall} />

      {/* Key terms */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <KeyTerm label={t.sumInsured} value={pick(offer.sumInsuredOrLimit, lang)} />
        <KeyTerm label={t.deductible} value={pick(offer.deductible, lang)} />
        <KeyTerm label={t.assistance} value={pick(offer.assistance, lang)} />
        <KeyTerm label={t.claims} value={pick(offer.claimsHandling, lang)} />
        <KeyTerm label={t.payment} value={pick(offer.paymentOptions, lang)} />
        <KeyTerm label={t.file} value={offer.sourceFile} />
      </div>

      {/* Coverages / exclusions */}
      {(offer.coverages.length > 0 || offer.exclusions.length > 0) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {offer.coverages.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {t.coverages}
              </span>
              <LocalizedList items={offer.coverages} lang={lang} marker="✓" markerColor="text-emerald-500" />
            </div>
          )}
          {offer.exclusions.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {t.exclusions}
              </span>
              <LocalizedList items={offer.exclusions} lang={lang} marker="✕" markerColor="text-zinc-400" />
            </div>
          )}
        </div>
      )}

      {/* Strengths / weaknesses / red flags */}
      {(offer.strengths.length > 0 || offer.weaknesses.length > 0 || offer.redFlags.length > 0) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {offer.strengths.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                {t.strengths}
              </span>
              <LocalizedList items={offer.strengths} lang={lang} marker="✓" markerColor="text-emerald-500" />
            </div>
          )}
          {offer.weaknesses.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                {t.weaknesses}
              </span>
              <LocalizedList items={offer.weaknesses} lang={lang} marker="✗" markerColor="text-amber-500" />
            </div>
          )}
          {offer.redFlags.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-400">
                {t.redFlags}
              </span>
              <LocalizedList items={offer.redFlags} lang={lang} marker="⚠" markerColor="text-rose-500" />
            </div>
          )}
        </div>
      )}

      {/* Dimension scores (collapsible) */}
      <div className="border-t border-zinc-100 pt-3 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setShowScores((v) => !v)}
          aria-expanded={showScores}
          className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
        >
          {showScores ? t.hideScores : t.showScores}
          <svg
            className={cx('h-4 w-4 transition-transform', showScores && 'rotate-180')}
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
        {showScores && (
          <div className="mt-3 flex flex-col gap-2">
            {dims.map((d) => (
              <ScoreBar key={d.key} label={d.label} value={offer.scores[d.key]} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- main ---------- */

export function Results({
  result,
  report,
  lang,
}: {
  result: ComparisonResult;
  report: ReportInfo;
  lang: Lang;
}) {
  const t = UI[lang];
  const [preview, setPreview] = useState(false);

  const winnerKey = `${result.winner.insurer}::${result.winner.sourceFile}`;

  return (
    <div className="flex flex-col gap-6">
      {/* Header with type + PDF actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            {pick(result.detectedInsuranceType, lang)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPreview((v) => !v)}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {preview ? t.hidePreview : t.previewPdf}
          </button>
          <a
            href={report.dataUrl}
            download={report.filename}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {t.downloadPdf}
          </a>
        </div>
      </div>

      {preview && (
        <iframe
          title={report.filename}
          src={report.dataUrl}
          className="h-[600px] w-full rounded-2xl border border-zinc-200 dark:border-zinc-800"
        />
      )}

      {/* Executive summary */}
      <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5 dark:border-indigo-900 dark:bg-indigo-950/40">
        <SectionTitle>{t.summary}</SectionTitle>
        <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-200">
          {pick(result.executiveSummary, lang)}
        </p>
        {result.clientNeedsSummary && (
          <div className="mt-3 border-t border-indigo-200/60 pt-3 dark:border-indigo-900/60">
            <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
              {t.clientNeeds}
            </span>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              {pick(result.clientNeedsSummary, lang)}
            </p>
          </div>
        )}
      </div>

      {/* Picks */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <PickCard kind="winner" label={t.mostAdvantageous} pick={result.winner} lang={lang} />
        <PickCard kind="cheapest" label={t.cheapest} pick={result.cheapest} lang={lang} />
        <PickCard kind="bestCoverage" label={t.bestCoverage} pick={result.bestCoverage} lang={lang} />
      </div>

      {/* Recommendation */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <SectionTitle>{t.recommendation}</SectionTitle>
        <p className="mt-2 text-lg font-bold text-emerald-600 dark:text-emerald-400">
          {result.recommendation.pick}
        </p>
        <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
          {pick(result.recommendation.rationale, lang)}
        </p>
      </div>

      {/* Insured subject (property-type offers) */}
      {result.insuredSubject && (
        <InsuredSubjectBlock subject={result.insuredSubject} lang={lang} />
      )}

      {/* Coverage matrix — the backbone of the comparison */}
      <CoverageMatrixTable matrix={result.coverageMatrix} lang={lang} />

      {/* Offers */}
      <div className="flex flex-col gap-4">
        <SectionTitle>{t.offersTitle}</SectionTitle>
        {result.offers.map((offer, i) => (
          <OfferCard
            key={`${offer.insurer}::${offer.sourceFile}::${i}`}
            offer={offer}
            lang={lang}
            isWinner={`${offer.insurer}::${offer.sourceFile}` === winnerKey}
          />
        ))}
      </div>

      {/* Similarities / differences */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {result.similarities.length > 0 && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <SectionTitle>{t.similarities}</SectionTitle>
            <div className="mt-3">
              <LocalizedList items={result.similarities} lang={lang} />
            </div>
          </div>
        )}
        {result.differences.length > 0 && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <SectionTitle>{t.differences}</SectionTitle>
            <div className="mt-3">
              <LocalizedList items={result.differences} lang={lang} />
            </div>
          </div>
        )}
      </div>

      {/* What to watch */}
      {result.whatToWatch.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/30">
          <SectionTitle>{t.whatToWatch}</SectionTitle>
          <div className="mt-3">
            <LocalizedList items={result.whatToWatch} lang={lang} marker="⚠" markerColor="text-amber-500" />
          </div>
        </div>
      )}

      {/* Glossary */}
      {result.glossary.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <SectionTitle>{t.glossary}</SectionTitle>
          <dl className="mt-3 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
            {result.glossary.map((g, i) => (
              <div key={i} className="flex flex-col gap-0.5">
                <dt className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {pick(g.term, lang)}
                </dt>
                <dd className="text-sm text-zinc-600 dark:text-zinc-400">
                  {pick(g.definition, lang)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {/* Disclaimers */}
      {result.disclaimers.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {t.disclaimers}
          </span>
          <ul className="mt-2 flex flex-col gap-1">
            {result.disclaimers.map((d, i) => (
              <li key={i} className="text-xs italic leading-relaxed text-zinc-500 dark:text-zinc-400">
                {pick(d, lang)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
