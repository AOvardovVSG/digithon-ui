'use client';

import { useEffect, useRef, useState } from 'react';
import type { ComparisonResult } from '@/mastra/schemas/output';
import { cx, UI, type Lang } from './i18n';
import { Spinner } from './ui';
import { FileDropzone } from './FileDropzone';
import {
  buildClientProfile,
  ClientProfileForm,
  emptyProfile,
  type ProfileState,
} from './ClientProfileForm';
import { Results } from './Results';

const MAX_TOTAL_BYTES = 45 * 1024 * 1024;

interface ReportInfo {
  filename: string;
  mimeType: string;
  dataUrl: string;
}

interface AnalyzeResponse {
  result: ComparisonResult;
  report: ReportInfo;
}

type Status = 'idle' | 'analyzing' | 'done' | 'error';

function LanguageToggle({
  lang,
  onChange,
}: {
  lang: Lang;
  onChange: (lang: Lang) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-zinc-300 p-0.5 dark:border-zinc-700">
      {(['bg', 'en'] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => onChange(l)}
          className={cx(
            'rounded-md px-3 py-1 text-sm font-semibold uppercase transition-colors',
            lang === l
              ? 'bg-indigo-600 text-white'
              : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800',
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

export function Analyzer() {
  const [lang, setLang] = useState<Lang>('bg');
  const [files, setFiles] = useState<File[]>([]);
  const [profile, setProfile] = useState<ProfileState>(emptyProfile);
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [report, setReport] = useState<ReportInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resultsRef = useRef<HTMLDivElement>(null);
  const t = UI[lang];

  // Keep the document language in sync with the toggle.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // Scroll to results once they're ready.
  useEffect(() => {
    if (status === 'done' && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [status]);

  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
  const tooLarge = totalBytes > MAX_TOTAL_BYTES;
  const canSubmit = files.length >= 2 && !tooLarge && status !== 'analyzing';

  async function handleAnalyze() {
    if (!canSubmit) return;
    setStatus('analyzing');
    setError(null);
    setResult(null);
    setReport(null);

    try {
      const fd = new FormData();
      for (const f of files) fd.append('files', f);
      fd.append('reportLang', lang);
      const clientProfile = buildClientProfile(profile);
      if (clientProfile) fd.append('profile', JSON.stringify(clientProfile));

      const res = await fetch('/api/analyze', { method: 'POST', body: fd });
      const json = (await res.json()) as Partial<AnalyzeResponse> & { error?: string };

      if (!res.ok || !json.result || !json.report) {
        throw new Error(json.error || t.genericError);
      }

      setResult(json.result);
      setReport(json.report);
      setStatus('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : t.genericError);
      setStatus('error');
    }
  }

  function handleReset() {
    setStatus('idle');
    setResult(null);
    setReport(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const busy = status === 'analyzing';

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
      {/* Header */}
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
            {t.appTitle}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">{t.appSubtitle}</p>
        </div>
        <LanguageToggle lang={lang} onChange={setLang} />
      </header>

      {/* Input card */}
      <section className="flex flex-col gap-5 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{t.uploadTitle}</h2>
          <FileDropzone files={files} onChange={setFiles} lang={lang} disabled={busy} />
          {tooLarge && (
            <p className="text-sm font-medium text-rose-600 dark:text-rose-400">{t.tooLarge}</p>
          )}
        </div>

        <ClientProfileForm value={profile} onChange={setProfile} lang={lang} disabled={busy} />

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={!canSubmit}
            className={cx(
              'inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 text-base font-semibold text-white shadow-sm transition-colors',
              canSubmit
                ? 'bg-indigo-600 hover:bg-indigo-700'
                : 'cursor-not-allowed bg-zinc-300 dark:bg-zinc-700',
            )}
          >
            {busy && <Spinner className="h-5 w-5" />}
            {busy ? t.analyzing : t.analyze}
          </button>
          {!busy && files.length < 2 && (
            <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">{t.needTwo}</p>
          )}
        </div>
      </section>

      {/* Status / results */}
      <div ref={resultsRef} className="mt-8 scroll-mt-6">
        {status === 'analyzing' && (
          <div className="flex flex-col items-center gap-3 rounded-3xl border border-zinc-200 bg-white px-6 py-12 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <Spinner className="h-8 w-8 text-indigo-600" />
            <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {t.analyzingTitle}
            </p>
            <p className="max-w-sm text-sm text-zinc-500 dark:text-zinc-400">{t.analyzingHint}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-3 rounded-3xl border border-rose-200 bg-rose-50 px-6 py-10 text-center dark:border-rose-900 dark:bg-rose-950/40">
            <p className="text-base font-semibold text-rose-700 dark:text-rose-300">{t.errorTitle}</p>
            <p className="max-w-md text-sm text-rose-600 dark:text-rose-400">
              {error ?? t.genericError}
            </p>
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={!canSubmit}
              className="mt-1 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-50"
            >
              {t.retry}
            </button>
          </div>
        )}

        {status === 'done' && result && report && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{t.resultsTitle}</h2>
              <button
                type="button"
                onClick={handleReset}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                {t.newAnalysis}
              </button>
            </div>
            <Results result={result} report={report} lang={lang} />
          </div>
        )}
      </div>
    </div>
  );
}
