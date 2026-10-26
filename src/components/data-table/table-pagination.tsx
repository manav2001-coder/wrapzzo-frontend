import { useTranslation } from "react-i18next";

import type { Table } from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Capped at 100 because `paginationQuerySchema` rejects anything larger with a 400, not a
 * clamp — v4 offers 500 and 1000, which this API would refuse outright.
 */
const PAGE_SIZES = [10, 25, 50, 100];

interface TablePaginationProps<TData> {
  table: Table<TData>;
  totalCount?: number;
  /** `totalCount` is a lower bound — the server stopped counting — so it reads "10000+". */
  totalCapped?: boolean;
}

export function TablePagination<TData>({
  table,
  totalCount,
  totalCapped,
}: TablePaginationProps<TData>) {
  const { t } = useTranslation();
  const { pageIndex, pageSize } = table.getState().pagination;
  const pageCount = Math.max(table.getPageCount(), 1);
  const rowsOnPage = table.getRowModel().rows.length;
  // With zero rows there is no range to describe: "1–0 of 0" is worse than "0 of 0".
  const start = rowsOnPage === 0 ? 0 : pageIndex * pageSize + 1;
  const end = totalCount
    ? Math.min(pageIndex * pageSize + rowsOnPage, totalCount)
    : pageIndex * pageSize + rowsOnPage;
  // The caller's initial pageSize (e.g. a demo's `pageSize={3}`) may not be one of the
  // standard options — include it so the trigger always shows a matching selected value.
  const pageSizeOptions = PAGE_SIZES.includes(pageSize)
    ? PAGE_SIZES
    : [pageSize, ...PAGE_SIZES].sort((a, b) => a - b);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{t("table.rowsPerPage")}</span>
        <Select value={String(pageSize)} onValueChange={(v) => table.setPageSize(Number(v))}>
          <SelectTrigger size="sm" className="w-[70px]" aria-label={t("table.rowsPerPage")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">
          {totalCount !== undefined
            ? t("table.rangeOf", { start, end, total: totalCapped ? `${totalCount}+` : totalCount })
            : t("table.page", { page: pageIndex + 1, total: pageCount })}
        </span>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            aria-label={t("table.firstPage")}
          >
            <ChevronsLeft />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label={t("table.previousPage")}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label={t("table.nextPage")}
          >
            <ChevronRight />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => table.setPageIndex(pageCount - 1)}
            disabled={!table.getCanNextPage()}
            aria-label={t("table.lastPage")}
          >
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * The pagination bar's shape while the first page loads. Drawn in the same slot, with the same
 * heights, so the bar does not pop in under the rows and push the layout when they arrive.
 * Decorative: the table's own loading state is what is announced.
 */
export function TablePaginationSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-wrap items-center justify-between gap-3">
      <Skeleton className="h-8 w-40" />
      <div className="flex items-center gap-3">
        <Skeleton className="h-5 w-28" />
        <div className="flex gap-1">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-8 w-8" />
          ))}
        </div>
      </div>
    </div>
  );
}
