import type { Column } from "@tanstack/react-table";

/**
 * `aria-sort` for a `<th>` — how a screen reader reports which column is sorted.
 *
 * Its own module rather than a second export from `sortable-header.tsx`: a pure helper
 * exported beside a component defeats Fast Refresh for that component's whole file, which is
 * why `scroll-to-top.ts` and `splice-reorder.ts` exist too.
 *
 * `undefined` for a column that cannot sort — `aria-sort="none"` on an unsortable column
 * announces it as sortable-but-unsorted, which is a lie.
 */
export function ariaSortFor<TData>(
  column: Column<TData, unknown>,
): "ascending" | "descending" | "none" | undefined {
  if (!column.getCanSort()) return undefined;
  const direction = column.getIsSorted();
  if (direction === "asc") return "ascending";
  if (direction === "desc") return "descending";
  return "none";
}
