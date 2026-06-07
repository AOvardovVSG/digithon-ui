import type { NextRequest } from 'next/server';
import { analyzeOffers } from '@/mastra/lib/analyze';
import type { UploadedFile } from '@/mastra/lib/document-parsing';
import { AnalysisInputSchema, ClientProfileSchema, type ClientProfile } from '@/mastra/schemas/input';
import type { Lang } from '@/mastra/schemas/output';

// pdfmake/mammoth/xlsx + Mastra need the Node.js runtime (not Edge).
export const runtime = 'nodejs';
// Allow long model generations.
export const maxDuration = 120;

// OpenAI caps a single request's files at 50 MB; keep a safety margin.
const MAX_TOTAL_BYTES = 45 * 1024 * 1024;

/**
 * POST /api/analyze — multipart/form-data:
 *   - files:      2+ offer files (PDF / DOCX / XLSX)
 *   - profile:    (optional) JSON string matching ClientProfileSchema
 *   - reportLang: (optional) "bg" | "en" — PDF language, defaults to "bg"
 *
 * Returns JSON: { result: ComparisonResult, report: { filename, mimeType, dataUrl } }
 */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();

    const fileEntries = form.getAll('files').filter((f): f is File => f instanceof File);
    if (fileEntries.length < 2) {
      return Response.json(
        { error: 'Нужни са поне 2 оферти (файла) за сравнение. / At least 2 offer files are required.' },
        { status: 400 },
      );
    }

    // Optional client profile (JSON string).
    let clientProfile: ClientProfile | null = null;
    const profileRaw = form.get('profile');
    if (typeof profileRaw === 'string' && profileRaw.trim()) {
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(profileRaw);
      } catch {
        return Response.json({ error: 'Невалиден JSON в полето "profile".' }, { status: 400 });
      }
      const parsed = ClientProfileSchema.safeParse(parsedJson);
      if (!parsed.success) {
        return Response.json(
          { error: 'Невалиден профил на клиента.', details: parsed.error.flatten() },
          { status: 400 },
        );
      }
      clientProfile = parsed.data;
    }

    const reportLangRaw = form.get('reportLang');
    const reportLang: Lang = reportLangRaw === 'en' ? 'en' : 'bg';

    // Read file bytes, enforcing the size cap via File.size BEFORE buffering each
    // file (File.size comes from multipart headers, no body read needed).
    const files: UploadedFile[] = [];
    let totalBytes = 0;
    for (const file of fileEntries) {
      totalBytes += file.size;
      if (totalBytes > MAX_TOTAL_BYTES) {
        return Response.json(
          { error: 'Общият размер на файловете надвишава 45 MB. / Total file size exceeds 45 MB.' },
          { status: 413 },
        );
      }
      files.push({
        filename: file.name,
        mimeType: file.type || 'application/octet-stream',
        bytes: new Uint8Array(await file.arrayBuffer()),
      });
    }

    // Validate the structured input (metadata + profile).
    const metaCheck = AnalysisInputSchema.safeParse({
      files: files.map((f) => ({ filename: f.filename, mimeType: f.mimeType, sizeBytes: f.bytes.byteLength })),
      clientProfile,
    });
    if (!metaCheck.success) {
      return Response.json(
        { error: 'Невалидни входни данни.', details: metaCheck.error.flatten() },
        { status: 400 },
      );
    }

    const { result, pdf } = await analyzeOffers(files, clientProfile, { reportLang });

    return Response.json({
      result,
      report: { filename: pdf.filename, mimeType: 'application/pdf', dataUrl: pdf.dataUrl },
    });
  } catch (err) {
    // Log full detail server-side; return a generic message so model/file internals
    // (paths, request ids, prompt fragments) are not leaked to the client.
    console.error('[api/analyze] error:', err);
    return Response.json(
      { error: 'Грешка при анализа. / Analysis failed.' },
      { status: 500 },
    );
  }
}
