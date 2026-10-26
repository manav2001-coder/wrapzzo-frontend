import {
  TABLE_PREFERENCE_MAX_WIDTH,
  TABLE_PREFERENCE_MIN_WIDTH,
  type ListFieldKind,
} from "@/lib/list-fields";

/** Narrowest and widest a user can drag any column: what the server accepts, so a saved layout is never rejected. */
export const MIN_COLUMN_SIZE = TABLE_PREFERENCE_MIN_WIDTH;
export const MAX_COLUMN_SIZE = TABLE_PREFERENCE_MAX_WIDTH;

/** The fixed utility columns the table adds itself (select, expand): ids, and the width they keep. */
export const SELECT_COLUMN_ID = "__select__";
export const EXPAND_COLUMN_ID = "__expand__";
export const SELECT_COLUMN_SIZE = 44;
export const EXPAND_COLUMN_SIZE = 44;

/** Pixels one header character needs at `text-sm`, plus the cell's padding and the sort/resize chrome. */
const HEADER_CHAR_PX = 8;
const HEADER_CHROME_PX = 56;

/**
 * Starting width per published list-field kind. Fixed at development time on purpose: nothing is
 * measured from the loaded rows, so paging never makes a column jump.
 */
const KIND_SIZE: Record<ListFieldKind, number> = {
  id: 120,
  boolean: 100,
  number: 120,
  date: 140,
  enum: 150,
  text: 200,
};

const FALLBACK_SIZE = KIND_SIZE.text;

export interface ColumnSizeInput {
  /** Rendered header text, when it is a plain string. */
  header?: unknown;
  /** The column's own `size`, which always wins. */
  size?: number;
  kind?: ListFieldKind;
}

/** Clamp to what a user can drag to, so a stored or declared width can never break the layout. */
export function clampColumnSize(size: number): number {
  return Math.min(MAX_COLUMN_SIZE, Math.max(MIN_COLUMN_SIZE, Math.round(size)));
}

/**
 * The width a column opens at before the user has resized it: its own `size`, else the kind's
 * width, never narrower than its title needs. A declared `size` is kept as it is.
 */
export function defaultColumnSize({ header, size, kind }: ColumnSizeInput): number {
  // A width a screen declares in code never goes to the server, so it needs only to be sane; the
  // drag minimum exists so a width a USER dragged to is one the server accepts.
  if (typeof size === "number") return Math.min(MAX_COLUMN_SIZE, Math.max(1, Math.round(size)));
  const base = kind ? KIND_SIZE[kind] : FALLBACK_SIZE;
  const titleFloor =
    typeof header === "string" ? header.length * HEADER_CHAR_PX + HEADER_CHROME_PX : 0;
  return clampColumnSize(Math.max(base, titleFloor));
}

/**
 * Keep only widths for columns that still exist and clamp each one, so a layout saved before an
 * admin hid or renamed a column cannot resurrect it or carry a stale value.
 */
export function reconcileSizing(
  sizing: Record<string, number>,
  columnIds: readonly string[],
): Record<string, number> {
  const known = new Set(columnIds);
  const next: Record<string, number> = {};
  for (const [id, size] of Object.entries(sizing)) {
    if (known.has(id) && Number.isFinite(size)) next[id] = clampColumnSize(size);
  }
  return next;
}

/** The width map without one column — what a double-click reset leaves behind. */
export function withoutColumn(
  sizing: Record<string, number>,
  columnId: string,
): Record<string, number> {
  const next = { ...sizing };
  delete next[columnId];
  return next;
}
