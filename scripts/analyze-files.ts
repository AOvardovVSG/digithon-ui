/**
 * No-UI end-to-end runner for the insurance comparison agent.
 *
 * Drives the SAME pipeline the API route uses (analyzeOffers: parse files -> one
 * structured agent call -> render PDF) straight from the command line, so you can test
 * the agent against real offer files and get the comparison PDF a UI would produce.
 *
 * Requires OPENAI_API_KEY (the live model call). Bun auto-loads .env.local, so putting
 * the key there is enough.
 *
 * Usage:
 *   bun run scripts/analyze-files.ts [file ...] [--lang bg|en] [--both] [--out dir] [--profile profile.json]
 *
 * With no file arguments it defaults to the three sample offers in ~/Downloads.
 * Outputs (default ./out):
 *   - result.json                       the full ComparisonResult
 *   - insurance-comparison-<lang>.pdf    the rendered report(s)
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { analyzeOffers } from '../src/mastra/lib/analyze';
import type { UploadedFile } from '../src/mastra/lib/document-parsing';
import { renderComparisonPdf } from '../src/mastra/lib/report-pdf';
import { ClientProfileSchema, type ClientProfile } from '../src/mastra/schemas/input';
import type { Lang } from '../src/mastra/schemas/output';

const HOME = process.env.HOME ?? '';
const DEFAULT_FILES = [
  `${HOME}/Downloads/Оферта България Иншурънс.pdf`,
  `${HOME}/Downloads/Оферта ДЗИ.pdf`,
  `${HOME}/Downloads/offer-armeec 1.pdf`,
];

/** Best-effort MIME type from the file extension (the parser also sniffs by extension). */
function mimeFor(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop() ?? '';
  switch (ext) {
    case 'pdf':
      return 'application/pdf';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'xls':
      return 'application/vnd.ms-excel';
    default:
      return 'application/octet-stream';
  }
}

interface Args {
  files: string[];
  lang: Lang;
  both: boolean;
  outDir: string;
  profilePath: string | null;
}

function parseArgs(argv: string[]): Args {
  const files: string[] = [];
  let lang: Lang = 'bg';
  let both = false;
  let outDir = 'out';
  let profilePath: string | null = null;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--lang') lang = argv[++i] === 'en' ? 'en' : 'bg';
    else if (a === '--both') both = true;
    else if (a === '--out') outDir = argv[++i] ?? outDir;
    else if (a === '--profile') profilePath = argv[++i] ?? null;
    else if (a.startsWith('--')) console.warn(`Ignoring unknown flag: ${a}`);
    else files.push(a);
  }

  return { files: files.length ? files : DEFAULT_FILES, lang, both, outDir, profilePath };
}

function loadFile(path: string): UploadedFile {
  const bytes = new Uint8Array(readFileSync(path));
  return { filename: basename(path), mimeType: mimeFor(path), bytes };
}

function loadProfile(path: string | null): ClientProfile | null {
  if (!path) return null;
  const parsed = ClientProfileSchema.safeParse(JSON.parse(readFileSync(path, 'utf8')));
  if (!parsed.success) {
    throw new Error(`Invalid client profile in ${path}: ${parsed.error.message}`);
  }
  return parsed.data;
}

async function main() {
  const { files: filePaths, lang, both, outDir, profilePath } = parseArgs(process.argv.slice(2));

  if (!process.env.OPENAI_API_KEY) {
    console.error(
      'ERROR: OPENAI_API_KEY is not set. The live analysis needs it.\n' +
        'Add it to .env.local (Bun loads it automatically):\n' +
        '  echo "OPENAI_API_KEY=sk-..." >> .env.local\n' +
        'or export it for this run:\n' +
        '  OPENAI_API_KEY=sk-... bun run scripts/analyze-files.ts',
    );
    process.exit(1);
  }

  const files = filePaths.map(loadFile);
  const profile = loadProfile(profilePath);

  const totalKB = Math.round(files.reduce((n, f) => n + f.bytes.byteLength, 0) / 1024);
  console.log(`Analyzing ${files.length} offer(s) [${totalKB} KB total], report language: ${lang}${both ? ' + the other' : ''}`);
  for (const f of files) console.log(`  • ${f.filename}`);

  const started = performance.now();
  const { result, pdf } = await analyzeOffers(files, profile, { reportLang: lang });
  const secs = ((performance.now() - started) / 1000).toFixed(1);

  mkdirSync(outDir, { recursive: true });

  // Full structured result (handy for inspecting the matrix the model produced).
  const resultPath = join(outDir, 'result.json');
  writeFileSync(resultPath, JSON.stringify(result, null, 2));

  // Primary PDF (already rendered by analyzeOffers), plus the other language on request.
  const written = [pdf];
  if (both) written.push(await renderComparisonPdf(result, profile, lang === 'bg' ? 'en' : 'bg'));
  for (const r of written) writeFileSync(join(outDir, r.filename), r.buffer);

  // Concise summary.
  console.log(`\nDone in ${secs}s.`);
  console.log(`Insurance type : ${result.detectedInsuranceType.bg} / ${result.detectedInsuranceType.en}`);
  console.log(`Matrix         : ${result.coverageMatrix.rows.length} risks × ${result.coverageMatrix.insurers.length} insurers`);
  console.log('Premiums       :');
  for (const o of result.offers) {
    const prem = o.annualPremium == null ? '—' : `${o.annualPremium.toLocaleString('bg-BG')} ${o.currency}`;
    console.log(`  • ${o.insurer}: ${prem}  (score ${Math.round(o.weightedScore)}/100)`);
  }
  console.log(`Winner         : ${result.winner.insurer}`);
  console.log(`\nWrote:`);
  console.log(`  • ${resultPath}`);
  for (const r of written) console.log(`  • ${join(outDir, r.filename)}`);
}

main().catch((err) => {
  console.error('\nAnalysis failed:', err);
  process.exit(1);
});
