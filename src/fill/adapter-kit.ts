import type { PropertyProposal } from '@/mastra/schemas/proposal';

/** One form-field widget as extracted offline (see scripts/prepare-templates.py). */
export interface FieldDef {
  name: string;
  type: string; // '/Tx' | '/Btn' | ...
  page: number;
  pageWidth: number;
  pageHeight: number;
  rotate: number;
  /** [x0, y0, x1, y1] in PDF user space (origin bottom-left), MediaBox-relative. */
  rect: [number, number, number, number];
  onState: string | null;
}

/** A single stamping instruction the engine applies to the template. */
export interface FillOp {
  /** Field NAME as it appears in fields.json. */
  field: string;
  kind: 'text' | 'check';
  value?: string;
  /** Optional alignment for text (default left). */
  align?: 'left' | 'center' | 'right';
  /** When a name is shared by several widgets, pick this 0-based occurrence. */
  index?: number;
}

/** An adapter maps a (partial) proposal to stamping ops for one provider's template. */
export type Adapter = (p: PropertyProposal) => Array<FillOp | null | undefined>;

// ---- declarative builders (keep adapters terse) ----------------------------------------

/** Text op, or null when the value is empty (so it's skipped). */
export function T(
  field: string,
  value: string | number | null | undefined,
  opts: { align?: FillOp['align']; index?: number } = {},
): FillOp | null {
  if (value == null || value === '') return null;
  return { field, kind: 'text', value: String(value), align: opts.align, index: opts.index };
}

/** Check op, emitted only when `on` is truthy. */
export function C(field: string, on: unknown, index?: number): FillOp | null {
  return on ? { field, kind: 'check', index } : null;
}

/** Map an enum value to a field name via a lookup table, returning a check op. */
export function Choice<V extends string>(
  value: V | null | undefined,
  table: Partial<Record<V, string>>,
): FillOp | null {
  if (!value) return null;
  const field = table[value];
  return field ? { field, kind: 'check' } : null;
}

/** For a multi-select array: a check op per present value, via a lookup table. */
export function Multi<V extends string>(
  values: readonly V[] | null | undefined,
  table: Partial<Record<V, string>>,
): Array<FillOp | null> {
  if (!values) return [];
  return values.map((v) => (table[v] ? { field: table[v] as string, kind: 'check' } : null));
}

/** A pair of yes/no checkboxes driven by a 'yes'|'no' answer. */
export function YN(
  value: 'yes' | 'no' | null | undefined,
  yesField: string,
  noField: string,
): Array<FillOp | null> {
  return [C(yesField, value === 'yes'), C(noField, value === 'no')];
}

/** Format a number as a grouped amount (Bulgarian locale): 1234567 -> "1 234 567". */
export function money(n: number | null | undefined): string | null {
  if (n == null) return null;
  return n.toLocaleString('bg-BG');
}
