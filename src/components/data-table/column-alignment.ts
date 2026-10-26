export type ColumnAlign = "left" | "center" | "right";

/**
 * Where a column's CELLS sit. Titles are always centred (`TableHead`), so cells are centred too by
 * default: a title over a left-aligned value reads as two unrelated things. A column that really is
 * long free text, or a figure to line up, says so with `meta.align`.
 */
export function defaultColumnAlign({ align }: { align?: ColumnAlign }): ColumnAlign {
  return align ?? "center";
}

export const ALIGN_CLASS: Record<ColumnAlign, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};
