import type * as React from "react";
import type { CellContext, ColumnDef } from "@tanstack/react-table";

export interface OpenOnRowClickOptions<R> {
  /** What clicking the row does — open the row's drawer. */
  open: (row: R) => void;
  /** The column rendered as a real `<button>`, the row's keyboard entry point. */
  buttonColumnId: string;
  /** That button's text, usually the row's name. */
  buttonLabel: (row: R) => React.ReactNode;
}

/**
 * Makes a whole `DataTable` row open something (a drawer) when clicked. `DataTable` has no
 * row-level `onClick`, so each cell fills its `<td>` (`-m-2 p-2`, `TableCell`'s own padding)
 * with a click target. One column is a real `<button>`, so the action has a properly
 * keyboard-reachable entry point; the other cells are mouse convenience on top of it.
 *
 * Duty Attendance and Employee Attendance both use it — one mechanism, so the two lists
 * cannot drift in how a row opens.
 */
export function openOnRowClick<R>(
  columns: ColumnDef<R, unknown>[],
  { open, buttonColumnId, buttonLabel }: OpenOnRowClickOptions<R>,
): ColumnDef<R, unknown>[] {
  return columns.map((column) => {
    const render = column.cell;
    // A column declared by `accessorKey` alone gets its id from TanStack later, not here.
    const id = column.id ?? (column as { accessorKey?: string }).accessorKey;
    return {
      ...column,
      cell: (ctx: CellContext<R, unknown>) => {
        if (id === buttonColumnId) {
          return (
            <button
              type="button"
              className="hover:bg-muted/40 -m-2 block w-full p-2 text-left font-medium hover:underline"
              onClick={() => open(ctx.row.original)}
            >
              {buttonLabel(ctx.row.original)}
            </button>
          );
        }
        const content =
          typeof render === "function"
            ? render(ctx)
            : ((ctx.getValue() as React.ReactNode) ?? null);
        return (
          <div
            className="hover:bg-muted/40 -m-2 cursor-pointer p-2"
            onClick={() => open(ctx.row.original)}
          >
            {content}
          </div>
        );
      },
    };
  });
}
