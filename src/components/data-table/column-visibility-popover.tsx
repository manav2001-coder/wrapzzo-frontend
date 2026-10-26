import { useTranslation } from "react-i18next";

import { ChevronDown, ChevronUp, RotateCcw, Settings2 } from "lucide-react";
import type { Table } from "@tanstack/react-table";

import { columnTitle } from "@/components/data-table/column-order";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface ColumnVisibilityPopoverProps<TData> {
  table: Table<TData>;
  /** Drops this user's saved widths, order and hidden columns, back to the franchise default. */
  onReset: () => void;
  /**
   * Moves a column to where another is. The popover's earlier and later buttons name the
   * neighbour: the keyboard and screen-reader route to the same reorder a header drag gives a
   * pointer user.
   */
  onMove: (columnId: string, overId: string) => void;
}

/**
 * "Configure columns" popover — only rendered when `configNamespace` is given.
 *
 * Reads and writes the TABLE's visibility state and nothing else. It used to also call
 * `useTableColumnConfig` itself, which made the localStorage copy the source of truth for the
 * checkboxes while react-table's internal state drove the actual columns — so the two
 * disagreed after any remount. `DataTable` now holds the hook and feeds
 * `state.columnVisibility`, and this component just toggles.
 */
export function ColumnVisibilityPopover<TData>({
  table,
  onReset,
  onMove,
}: ColumnVisibilityPopoverProps<TData>) {
  const { t } = useTranslation();
  const columns = table.getAllLeafColumns().filter((col) => col.getCanHide());
  // The visible, movable columns in on-screen order: what "earlier" and "later" are measured in.
  const movable = columns.filter((col) => col.getIsVisible() && !col.columnDef.meta?.pin);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" aria-label={t("table.configureColumns")}>
          <Settings2 className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="max-h-80 w-64 space-y-2 overflow-y-auto">
        {columns.map((column) => {
          const position = movable.indexOf(column);
          return (
            <div key={column.id} className="flex items-center gap-2">
              <Checkbox
                id={`col-${column.id}`}
                checked={column.getIsVisible()}
                onCheckedChange={(checked) => column.toggleVisibility(checked === true)}
              />
              <Label
                htmlFor={`col-${column.id}`}
                className="min-w-0 flex-1 truncate text-sm font-normal"
              >
                {columnTitle(column)}
              </Label>
              {position >= 0 && (
                <div className="flex shrink-0">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={position === 0}
                    aria-label={t("table.moveColumnEarlier", { column: columnTitle(column) })}
                    onClick={() => onMove(column.id, movable[position - 1]!.id)}
                  >
                    <ChevronUp />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={position === movable.length - 1}
                    aria-label={t("table.moveColumnLater", { column: columnTitle(column) })}
                    onClick={() => onMove(column.id, movable[position + 1]!.id)}
                  >
                    <ChevronDown />
                  </Button>
                </div>
              )}
            </div>
          );
        })}
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={onReset}>
          <RotateCcw className="mr-2 h-4 w-4" />
          <span className="truncate">{t("table.resetColumns")}</span>
        </Button>
      </PopoverContent>
    </Popover>
  );
}
