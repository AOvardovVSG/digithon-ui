import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

/** An uploaded offer file (bytes + metadata). */
export interface UploadedFile {
  filename: string;
  mimeType: string;
  bytes: Uint8Array;
}

/**
 * A content part of a message to the model (AI SDK v6 shape).
 * PDFs are passed directly as a `file` part (the model reads both the text and the
 * page images — highest fidelity, including for scanned offers). Word/Excel are
 * extracted to text locally, since OpenAI does not read them natively.
 */
export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'file'; data: Uint8Array; mediaType: string; filename?: string };

const PDF_MIME = ['application/pdf'];
const DOCX_MIME = ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const XLS_MIME = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];

function extensionOf(filename: string): string {
  const i = filename.lastIndexOf('.');
  return i >= 0 ? filename.slice(i + 1).toLowerCase() : '';
}

/** Convert a single file into content parts for the model message. */
export async function fileToContentParts(file: UploadedFile): Promise<ContentPart[]> {
  const ext = extensionOf(file.filename);
  const isPdf = PDF_MIME.includes(file.mimeType) || ext === 'pdf';
  const isDocx = DOCX_MIME.includes(file.mimeType) || ext === 'docx';
  const isXls = XLS_MIME.includes(file.mimeType) || ext === 'xlsx' || ext === 'xls';

  // Section headers are in Bulgarian on purpose — they become part of the prompt the
  // Bulgarian agent reads, keeping file boundaries clear in its working language.
  if (isPdf) {
    return [
      { type: 'text', text: `\n\n=== Файл: ${file.filename} (PDF) ===` },
      { type: 'file', data: file.bytes, mediaType: 'application/pdf', filename: file.filename },
    ];
  }

  if (isDocx) {
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(file.bytes) });
    return [{ type: 'text', text: `\n\n=== Файл: ${file.filename} (Word) ===\n${value.trim()}` }];
  }

  if (isXls) {
    const workbook = XLSX.read(Buffer.from(file.bytes), { type: 'buffer' });
    const sheets = workbook.SheetNames.map((name) => {
      const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[name]);
      return `--- Лист: ${name} ---\n${csv.trim()}`;
    });
    return [{ type: 'text', text: `\n\n=== Файл: ${file.filename} (Excel) ===\n${sheets.join('\n\n')}` }];
  }

  // Fallback: treat as plain UTF-8 text.
  const text = new TextDecoder().decode(file.bytes);
  return [{ type: 'text', text: `\n\n=== Файл: ${file.filename} ===\n${text.trim()}` }];
}

/** Convert all files into a flat list of message content parts (concurrently). */
export async function filesToContentParts(files: UploadedFile[]): Promise<ContentPart[]> {
  const perFile = await Promise.all(files.map(fileToContentParts));
  return perFile.flat();
}
