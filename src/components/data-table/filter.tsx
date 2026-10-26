import type { Column } from "@tanstack/react-table";
import { Minus } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRangePicker, type DateRangeValue } from "@/components/fields/date-range-picker";
import { DebouncedInput } from "@/components/data-table/debounced-input";

interface FilterProps<TData> {
  column: Column<TData, unknown>;
  /** Overrides the per-column "Search <Column>" placeholder for the whole table. */
  columnFilterPlaceholder?: string;
  /** Bumped by Clear filters, to flush the debounced inputs and remount the pickers. */
  resetKey?: number;
}

/**
 * The control in a column's filter cell, chosen by `meta.filterVariant`.
 *
 * The variant is resolved before this renders — `DataTable` derives it from the column's
 * published `LIST_FIELDS` kind when the screen did not declare one, which is what gives every
 * text column a search box without 16 screens each opting in.
 */
export function Filter<TData>({ column, columnFilterPlaceholder, resetKey }: FilterProps<TData>) {
  const { t } = useTranslation();
  const meta = column.columnDef.meta;
  const variant = meta?.filterVariant ?? "text";
  const filterValue = column.getFilterValue();

  // v4's placeholder pattern: "Search Code" beats a generic "Filter…" when eight boxes sit in
  // a row. Only a string header can be reused as text — a custom header renderer falls back.
  const header = column.columnDef.header;
  const columnLabel = typeof header === "string" ? header : undefined;
  const textPlaceholder =
    columnFilterPlaceholder ??
    (columnLabel ? t("table.searchColumn", { column: columnLabel }) : t("table.searchPlaceholder"));

  if (variant === "select") {
    // Radix `SelectItem` refuses an empty-string `value` (it's the sentinel Radix itself
    // reserves for "nothing selected"), so clearing back to unfiltered needs its own
    // non-empty value — this was MISSING entirely: the menu only ever listed `filterOptions`,
    // with "All" showing as the trigger's placeholder but no actual way to pick it once any
    // real option had been chosen. `column.setFilterValue(undefined)` is what actually clears
    // the column filter; picking this item is the only path there other than the table's own
    // "Clear filters" button, which clears every column at once rather than just this one.
    const ALL = "__all__";
    // Normally "All". A column whose default view is not everything names it instead.
    const unsetLabel = meta?.filterUnsetLabel ?? t("table.filterAll");
    return (
      <Select
        value={(filterValue as string) ?? ALL}
        onValueChange={(v) => column.setFilterValue(v === ALL ? undefined : v)}
      >
        <SelectTrigger
          size="sm"
          aria-label={columnLabel}
          className="min-w-max gap-2 [&>span]:shrink-0 [&>span]:line-clamp-none"
        >
          <SelectValue placeholder={columnFilterPlaceholder ?? unsetLabel} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{unsetLabel}</SelectItem>
          {(meta?.filterOptions ?? []).map((option) => (
            <SelectItem key={String(option.value)} value={String(option.value)}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (variant === "multiselect") {
    const selected = new Set((filterValue as string[]) ?? []);
    return (
      <div className="flex flex-wrap gap-1">
        {(meta?.filterOptions ?? []).map((option) => {
          const key = String(option.value);
          const isSelected = selected.has(key);
          return (
            <button
              key={key}
              type="button"
              role="checkbox"
              aria-checked={isSelected}
              onClick={() => {
                const next = new Set(selected);
                if (isSelected) next.delete(key);
                else next.add(key);
                column.setFilterValue(next.size ? Array.from(next) : undefined);
              }}
              className={
                isSelected
                  ? "rounded border border-primary bg-primary px-2 py-0.5 text-xs text-primary-foreground"
                  : "rounded border border-input px-2 py-0.5 text-xs"
              }
            >
              {option.label}
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === "dateRange") {
    // Was two bare `<input type="date">`, which do not fit a header cell, style differently
    // in every browser, and cannot express "last 7 days".
    return (
      <DateRangePicker
        key={resetKey}
        size="sm"
        className="min-w-max [&>span]:shrink-0"
        value={filterValue as DateRangeValue | undefined}
        onChange={(next) => column.setFilterValue(next)}
        placeholder={columnFilterPlaceholder ?? t("dateRange.placeholder")}
      />
    );
  }

  if (variant === "numberRange") {
    const range = (filterValue as [string, string]) ?? ["", ""];
    /*
     * An all-empty range is NO filter, so it must be `undefined` rather than `["", ""]`.
     *
     * TanStack keys `columnFilters` on the value being set: handing it a tuple of empty
     * strings registers a filter ENTRY that filters nothing. `toFilter` correctly turns that
     * into no query param, so the list stays right — but `activeFilterCount` counts entries,
     * so the toolbar claimed "Clear filters 2" on a table nobody had filtered. Worse, the
     * button was inert: `clearFilters` empties the state and bumps `resetKey`, both inputs
     * then flush and re-register the same empty entry, and the badge could never reach 0.
     *
     * The text branch below has always collapsed its empty value with `v || undefined`; this
     * is the same rule for a two-ended range.
     */
    const commitRange = (next: [string | number, string | number]) =>
      column.setFilterValue(
        next.some((part) => part !== "" && part !== undefined && part !== null) ? next : undefined,
      );
    return (
      <div className="flex items-center gap-1">
        <DebouncedInput
          className="w-28"
          type="number"
          // No magnifying glass: a search icon inside a box labelled "Min" reads as a bug.
          showIcon={false}
          resetKey={resetKey}
          value={range[0]}
          aria-label={columnLabel ? `${columnLabel} ${t("table.min")}` : t("table.min")}
          placeholder={
            meta?.numberProps?.min !== undefined ? String(meta.numberProps.min) : t("table.min")
          }
          onFilterChange={(v) => commitRange([v, range[1]])}
        />
        <Minus aria-hidden className="h-3 w-3 shrink-0 text-muted-foreground" />
        <DebouncedInput
          className="w-28"
          type="number"
          showIcon={false}
          resetKey={resetKey}
          value={range[1]}
          aria-label={columnLabel ? `${columnLabel} ${t("table.max")}` : t("table.max")}
          placeholder={
            meta?.numberProps?.max !== undefined ? String(meta.numberProps.max) : t("table.max")
          }
          onFilterChange={(v) => commitRange([range[0], v])}
        />
      </div>
    );
  }

  return (
    <DebouncedInput
      fitPlaceholder
      resetKey={resetKey}
      value={(filterValue as string) ?? ""}
      // No `aria-label`: the placeholder already names the box, and duplicating the column
      // name into a label makes it match a loose `getByLabel(/<column>/i)` alongside the
      // FORM field of the same name. The select below does need one — a Radix trigger has no
      // placeholder to fall back on, and every column's would otherwise read "All".
      onFilterChange={(v) => column.setFilterValue(v || undefined)}
      placeholder={textPlaceholder}
    />
  );
}
