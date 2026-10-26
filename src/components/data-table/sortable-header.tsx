import * as React from "react";
import type { Column } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { useTranslation } from "react-i18next";

interface SortableHeaderProps<TData> {
  column: Column<TData, unknown>;
  children: React.ReactNode;
}

/**
 * A header label that sorts when clicked.
 *
 * Only rendered for a column the SERVER can order by — `LIST_FIELDS` decides, so a header
 * never offers a sort that `buildOrderBy` would silently ignore. That mattered enough to build
 * the contract first: v4 has ~40 files passing `enableSorting: false` to a table that never
 * implemented sorting at all, which is the same defect one step further along.
 *
 * The cycle is ascending → descending → unsorted. Unsorted is a real state, not a dead end:
 * it hands the ordering back to the screen's own default (Audit Log's newest-first), which a
 * two-state toggle could never restore.
 */
export function SortableHeader<TData>({ column, children }: SortableHeaderProps<TData>) {
  const { t } = useTranslation();
  const direction = column.getIsSorted();

  // What the NEXT click does, from the table itself: a table with a default order flips between
  // ascending and descending, one without hands the third click back to the server's default.
  const next = column.getNextSortingOrder();
  const hint =
    next === "desc"
      ? t("table.sortDesc")
      : next === "asc"
        ? t("table.sortAsc")
        : t("table.sortNone");

  return (
    <button
      type="button"
      className="inline-flex max-w-full items-center gap-1 rounded px-2 py-1 text-center hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      onClick={column.getToggleSortingHandler()}
      title={hint}
    >
      {/*
       * No `truncate` here. `overflow: hidden` makes a box report a ZERO intrinsic minimum
       * width to the browser's table auto-layout algorithm — so even with `TableHead`'s
       * `whitespace-nowrap` default, a sortable header's real label never counted toward its
       * column's width, and the column shrank to whatever the OTHER columns left over
       * ("Vehicle Number" rendering as "Vehicle N…"). A plain (non-sortable) header has never
       * had this problem, because it has no wrapper opting into overflow-hidden. Dropping it
       * here makes sortable and non-sortable headers size identically: full label width drives
       * the column, and `Table`'s own `overflow-auto` wrapper is what scrolls a table that
       * ends up wider than its container.
       */}
      <span>{children}</span>
      {direction === "asc" ? (
        <ArrowUp aria-hidden className="h-3.5 w-3.5 shrink-0" />
      ) : direction === "desc" ? (
        <ArrowDown aria-hidden className="h-3.5 w-3.5 shrink-0" />
      ) : (
        // Always present, so hovering is not the only way to discover the column sorts —
        // and so the header's width does not jump when a sort is applied.
        <ChevronsUpDown aria-hidden className="h-3.5 w-3.5 shrink-0 opacity-40" />
      )}
    </button>
  );
}
