'use client';

import { useRef, useState, type DragEvent } from 'react';
import { cx, UI, type Lang } from './i18n';

const ALLOWED_EXT = ['pdf', 'docx', 'xlsx', 'xls'];

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function extensionOf(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
}

function isAllowed(file: File): boolean {
  return ALLOWED_EXT.includes(extensionOf(file.name));
}

/** Badge color per file extension. */
function extColor(ext: string): string {
  if (ext === 'pdf') return 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300';
  if (ext === 'docx') return 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300';
  return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';
}

export function FileDropzone({
  files,
  onChange,
  lang,
  disabled,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  lang: Lang;
  disabled?: boolean;
}) {
  const t = UI[lang];
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [rejected, setRejected] = useState<string[]>([]);

  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);

  function addFiles(incoming: FileList | File[]) {
    const list = Array.from(incoming);
    const accepted = list.filter(isAllowed);
    const bad = list.filter((f) => !isAllowed(f)).map((f) => f.name);

    // De-duplicate by name + size so re-adding the same file is a no-op.
    const seen = new Set(files.map((f) => `${f.name}:${f.size}`));
    const merged = [...files];
    for (const f of accepted) {
      const key = `${f.name}:${f.size}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(f);
      }
    }
    setRejected(bad);
    onChange(merged);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  }

  function removeAt(index: number) {
    onChange(files.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Drop area */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cx(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors',
          dragging
            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40'
            : 'border-zinc-300 hover:border-indigo-400 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:border-indigo-500 dark:hover:bg-zinc-900',
          disabled && 'pointer-events-none opacity-60',
        )}
      >
        <svg
          className="h-9 w-9 text-indigo-500"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">{t.uploadHint}</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.uploadFormats}</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.xlsx,.xls,application/pdf"
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {/* Rejected-format warning */}
      {rejected.length > 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          {t.unsupported}: {rejected.join(', ')}
        </p>
      )}

      {/* File list */}
      {files.length > 0 && (
        <ul className="flex flex-col gap-2">
          {files.map((file, i) => {
            const ext = extensionOf(file.name) || 'file';
            return (
              <li
                key={`${file.name}:${file.size}:${i}`}
                className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <span
                  className={cx(
                    'inline-flex h-8 w-10 shrink-0 items-center justify-center rounded-md text-[10px] font-bold uppercase',
                    extColor(ext),
                  )}
                >
                  {ext}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-zinc-800 dark:text-zinc-100">
                  {file.name}
                </span>
                <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                  {formatBytes(file.size)}
                </span>
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  disabled={disabled}
                  aria-label={`${t.remove} ${file.name}`}
                  className="shrink-0 rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-zinc-800"
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Count / size summary */}
      {files.length > 0 && (
        <div className="flex items-center justify-between text-xs">
          <span
            className={cx(
              files.length < 2
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-zinc-500 dark:text-zinc-400',
            )}
          >
            {files.length < 2 ? t.needTwo : `${files.length} ${lang === 'bg' ? 'файла' : 'files'}`}
          </span>
          <span className="text-zinc-500 dark:text-zinc-400">
            {t.totalSize}: {formatBytes(totalBytes)}
          </span>
        </div>
      )}
    </div>
  );
}
