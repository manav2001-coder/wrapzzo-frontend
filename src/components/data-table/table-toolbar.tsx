import * as React from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DebouncedInput } from "@/components/data-table/debounced-input";

interface TableToolbarProps {
  /** Omitted when the table has no free-text search (`searchable={false}`). */
  search?: { value: string; onChange: (value: string) => void };
  /** Column filters + panel filters + search, for the badge and the Clear affordance. */
  activeFilterCount: number;
  onClearFilters: () => void;
  /** Bumped by Clear, so the debounced search box flushes rather than waiting it out. */
  resetKey: number;
  /** The page-level filter panel. */
  leading?: React.ReactNode;
  /** Bulk upload / download / column visibility / row actions. */
  trailing?: React.ReactNode;
}

/**
 * The row above the table: search and Clear on the left, actions on the right.
 *
 * The search box is what `table.searchPlaceholder` was translated for — that key, plus
 * `table.clearFilters`, `table.selectRow` and `table.selectAll`, sat in all three locales
 * unused, which is the clearest sign this row was designed and never built.
 *
 * Clear is deliberately ONE control covering column filters, panel filters and search
 * together. v4 splits them and gets it wrong in both directions: its toolbar button is shown
 * only when COLUMN filters exist but wipes panel filters too, and its panel's own "Clear All"
 * is reachable only while the panel is collapsed — so a panel-only filter cannot be cleared in
 * one click while the panel is open.
 */
export function TableToolbar({
  search,
  activeFilterCount,
  onClearFilters,
  resetKey,
  leading,
  trailing,
}: TableToolbarProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {search && (
          <div className="w-full sm:w-64">
            <DebouncedInput
              type="search"
              size="default"
              resetKey={resetKey}
              value={search.value}
              onFilterChange={(value) => search.onChange(String(value))}
              placeholder={t("table.searchPlaceholder")}
              aria-label={t("action.search")}
            />
          </div>
        )}
        {leading}
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={onClearFilters} className="gap-1">
            <X aria-hidden className="h-3.5 w-3.5" />
            {t("table.clearFilters")}
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
              {activeFilterCount}
            </Badge>
          </Button>
        )}
      </div>
      {trailing && <div className="flex items-center gap-2">{trailing}</div>}
    </div>
  );
}
