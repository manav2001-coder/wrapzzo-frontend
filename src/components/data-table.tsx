import * as React from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type ColumnSizingState,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppSelector } from "@/app/hooks";
import type { ListFieldMap } from "@/lib/list-fields";
import { cn } from "@/lib/utils";

import { downloadBlob } from "@/lib/download";
import { useTableColumnConfig } from "@/hooks/use-table-column-config";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ActionsToolbar } from "@/components/data-table/actions-toolbar";
import { ariaSortFor } from "@/components/data-table/aria-sort";
import { BulkUploadDialog } from "@/components/data-table/bulk-upload-dialog";
import { columnTitle, moveColumn } from "@/components/data-table/column-order";
import { DraggableHead } from "@/components/data-table/draggable-head";
import {
  ALIGN_CLASS,
  defaultColumnAlign,
  type ColumnAlign,
} from "@/components/data-table/column-alignment";
import { ColumnResizer } from "@/components/data-table/column-resizer";
import {
  EXPAND_COLUMN_ID,
  EXPAND_COLUMN_SIZE,
  SELECT_COLUMN_ID,
  SELECT_COLUMN_SIZE,
  defaultColumnSize,
  reconcileSizing,
  withoutColumn,
} from "@/components/data-table/column-sizing";
import { ColumnVisibilityPopover } from "@/components/data-table/column-visibility-popover";
import { Filter } from "@/components/data-table/filter";
import { IndeterminateCheckbox } from "@/components/data-table/indeterminate-checkbox";
import { isActiveFilterValue } from "@/components/data-table/filter-chip-label";
import {
  defaultFilterVariant,
  columnIdOf,
  fieldNameOf,
  isSortableKind,
  kindOf,
} from "@/components/data-table/list-field-policy";
import { panelFieldName, panelFilterVariant } from "@/components/data-table/panel-filter-variant";
import { RowSelectionBar } from "@/components/data-table/row-selection-bar";
import { EmptyTable } from "@/components/data-table/empty-table";
import { ErrorTable } from "@/components/data-table/error-table";
import { SortableHeader } from "@/components/data-table/sortable-header";
import { TableFilterPanel } from "@/components/data-table/table-filter-panel";
import { TablePagination, TablePaginationSkeleton } from "@/components/data-table/table-pagination";
import { TableToolbar } from "@/components/data-table/table-toolbar";
import type {
  BulkUploadConfig,
  DownloadAllConfig,
  FetchOptions,
  RowGroupConfig,
  TableAction,
  TableFilterField,
} from "@/components/data-table/types";

/**
 * A pinned column's cells: sticky at the right edge, opaque, with a rule on their left. The
 * background follows the row's own hover (`bg-muted/50` over the background, mixed opaque so the
 * scrolled cells never show through) and selection, so the pinned cell never reads as a strip.
 */
const PINNED_RIGHT =
  "sticky right-0 z-[1] bg-background shadow-[inset_1px_0_0_hsl(var(--border))] [tr:hover>&]:bg-[color-mix(in_srgb,hsl(var(--muted))_50%,hsl(var(--background)))] [tr[data-state=selected]>&]:bg-muted";

/** A column's own classes on its header, filter and body cells, plus the pinning it asks for. */
function columnClass(meta: { className?: string; pin?: "right" } | undefined): string | undefined {
  return meta?.pin === "right" ? cn(meta.className, PINNED_RIGHT) : meta?.className;
}

/** How a column's body cells align. Titles are always centred (`TableHead`), whatever the cells do. */
const cellAlignClass = (meta: { align?: ColumnAlign } | undefined): string | undefined =>
  meta?.align ? ALIGN_CLASS[meta.align] : undefined;

/** Width of a pinned (row actions) column when the screen does not size it. */
const PINNED_COLUMN_SIZE = 140;

/**
 * A cell is one truncated line; give it a native tooltip with its full text, but only when it is
 * actually cut off. Done on hover rather than at render so a 100-row table pays nothing for it.
 */
function titleIfTruncated(event: React.MouseEvent<HTMLElement>) {
  const cell = event.currentTarget;
  if (cell.scrollWidth > cell.clientWidth) cell.title = cell.textContent ?? "";
  else cell.removeAttribute("title");
}

/** Utility (select/expand) and pinned columns keep their place; every other header can be dragged. */
function isDraggableHeader(header: {
  isPlaceholder: boolean;
  column: { id: string; columnDef: { meta?: { pin?: "right" } } };
}): boolean {
  return (
    !header.isPlaceholder &&
    !header.column.columnDef.meta?.pin &&
    header.column.id !== SELECT_COLUMN_ID &&
    header.column.id !== EXPAND_COLUMN_ID
  );
}

export * from "@/components/data-table/types";

interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  /** Client mode. */
  data?: TData[];
  /** Server mode — mutually exclusive with `data`. */
  fetchData?: (
    options: FetchOptions,
  ) => Promise<{ rows: TData[]; pageCount: number; totalCount?: number; totalCapped?: boolean }>;
  tableId?: string;
  isLoading?: boolean;
  emptyMessage?: string;
  /** Replaces the default <EmptyTable /> body entirely. */
  emptyState?: React.ReactNode;
  pageSize?: number;
  /**
   * What the server can filter and sort by, from `LIST_FIELDS` — e.g.
   * `listFields={LIST_FIELDS.franchise}`.
   *
   * Given it, every column resolves its own filter control and sortability from the published
   * field KIND, so a screen declares nothing per column and cannot offer a control the server
   * would silently ignore. Omitted (client mode, the showcase), the table falls back to what
   * each column declares for itself.
   */
  listFields?: ListFieldMap;
  /**
   * The order the table opens in — a column `id` and a direction. The header arrow shows it and a
   * click on the header changes it as usual. Read once on mount; a screen that changes its default
   * (a tab switch) remounts the table with a `key`.
   */
  defaultSort?: { id: string; desc?: boolean };
  /** Free-text search box in the toolbar. On by default in server mode. */
  searchable?: boolean;
  tableFilterComponents?: (activeFilters: Record<string, unknown>) => TableFilterField[];
  /**
   * An extra control rendered in the toolbar beside the search box, to the LEFT of the
   * page-level filter panel (if any). For a filter the screen owns itself rather than one
   * `LIST_FIELDS`/`tableFilterComponents` can express — Put-Away's pending/completed `view` is
   * a bespoke query param, not a column or a panel field, so it has nowhere else to live.
   */
  toolbarFilter?: React.ReactNode;
  columnFilterPlaceholder?: string;
  showRowSelectionColumn?: boolean;
  getRowCanSelect?: (row: TData, selectedRows: TData[]) => boolean;
  getRowId?: (row: TData) => string;
  primaryActions?: TableAction<TData>[];
  secondaryActions?: TableAction<TData>[];
  downloadAllConfig?: DownloadAllConfig;
  bulkUploadConfig?: BulkUploadConfig;
  /**
   * Bulk import/export controls, rendered in the toolbar and handed the table's LIVE list
   * state.
   *
   * A render prop rather than a node, because that state is what makes an export correct:
   * "Download All" has to export the rows on screen, and only the table knows the search, the
   * sort and the column filters. These buttons started in the page header, where they could
   * see none of it — so every export sent an empty filter set and returned the whole table.
   *
   * The toolbar is also where they belong: beside the filter row they act on, which is where
   * `bulkUploadConfig`/`downloadAllConfig` already render.
   *
   * It receives the RAW `FetchOptions` rather than a finished `ExportParams`, and the screen
   * calls `buildExportParams` itself. The table cannot build the whole thing: a franchise
   * scope and a screen-level filter (Metadata's selected category) live on the screen, and a
   * super admin narrowed to one tenant must not receive a file holding every tenant.
   *
   * The second argument is the currently SELECTED rows (only meaningful with
   * `showRowSelectionColumn`) — for a bulk action that needs the actual row data rather than
   * a server-side export, e.g. printing a QR sticker per selected vehicle. Added as a second
   * parameter rather than a new callback prop so every existing caller (which reads only the
   * first argument) keeps working unchanged.
   */
  renderBulkActions?: (options: FetchOptions, selectedRows: TData[]) => React.ReactNode;
  refreshTrigger?: number;
  getRowCanExpand?: (row: TData) => boolean;
  renderSubRow?: (row: TData, isExpanded: boolean) => React.ReactNode;
  rowGroupConfig?: RowGroupConfig<TData>;
  permission?: string | string[];
  hideActionsIfNoPermission?: boolean;
  configNamespace?: string;
}

/**
 * Generic data table — mode is inferred from props: `data` present -> client mode
 * (manual pagination/filtering off, TanStack's row models run locally); `fetchData`
 * present -> server mode (manualPagination/manualFiltering/manualSorting, react-query +
 * keepPreviousData for no-flicker paging). Every other feature (filters/selection/expand/
 * grouping/bulk actions) is orthogonal to pagination mode, so this stays one component rather
 * than duplicating that surface across a DataTable/ServerDataTable split.
 */
export function DataTable<TData>({
  columns,
  data,
  fetchData,
  tableId = "default",
  isLoading: externalLoading,
  emptyMessage,
  emptyState,
  pageSize = 10,
  listFields,
  searchable,
  tableFilterComponents,
  toolbarFilter,
  columnFilterPlaceholder,
  showRowSelectionColumn = true,
  getRowCanSelect,
  getRowId,
  primaryActions,
  secondaryActions,
  downloadAllConfig,
  renderBulkActions,
  bulkUploadConfig,
  refreshTrigger,
  getRowCanExpand,
  renderSubRow,
  rowGroupConfig,
  permission,
  hideActionsIfNoPermission,
  configNamespace,
  defaultSort,
}: DataTableProps<TData>) {
  const { t } = useTranslation();
  const isServerMode = Boolean(fetchData);
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize });
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [panelFilters, setPanelFilters] = React.useState<Record<string, unknown>>({});
  const [sorting, setSorting] = React.useState<SortingState>(() =>
    defaultSort ? [{ id: defaultSort.id, desc: defaultSort.desc ?? false }] : [],
  );
  const [search, setSearch] = React.useState("");
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());
  const [uploadOpen, setUploadOpen] = React.useState(false);
  /** Bumped by Clear filters — flushes the debounced inputs instead of waiting them out. */
  const [filterResetKey, setFilterResetKey] = React.useState(0);
  const firstRender = React.useRef(true);

  const showSearch = searchable ?? isServerMode;

  /**
   * Columns with their filter control and sortability resolved.
   *
   * Doing it here rather than in the header means react-table stays the single source of truth
   * for `getCanSort()` / `getCanFilter()`, and an explicit `enableSorting: false` from a screen
   * still wins. Before this, a filter appeared only where a screen had hand-declared
   * `meta.filterVariant` — and since NO column anywhere declared `"text"`, no master could be
   * filtered by its own code or name at all.
   */
  const resolvedColumns = React.useMemo(
    () =>
      columns.map((column) => {
        const meta = column.meta ?? {};
        const kind = kindOf(listFields, fieldNameOf(column as Parameters<typeof fieldNameOf>[0]));
        // The width a column opens at: its own `size`, else the published kind's, never narrower
        // than its title. A row-actions column (pinned) has no kind and no text title.
        const size = meta.pin
          ? (column.size ?? PINNED_COLUMN_SIZE)
          : defaultColumnSize({ header: column.header, size: column.size, kind });
        const align = defaultColumnAlign({ align: meta.align });
        const variant = listFields
          ? (meta.filterVariant ?? defaultFilterVariant(kind, Boolean(meta.filterOptions)))
          : undefined;
        return {
          ...column,
          size,
          ...(listFields && {
            enableSorting: column.enableSorting ?? isSortableKind(kind),
            enableColumnFilter: column.enableColumnFilter ?? Boolean(variant),
          }),
          meta: { ...meta, align, ...(listFields && { filterVariant: variant }) },
        } as ColumnDef<TData, unknown>;
      }),
    [columns, listFields],
  );

  const columnIds = React.useMemo(
    () =>
      resolvedColumns
        .map((column) => columnIdOf(column as Parameters<typeof columnIdOf>[0]))
        .filter((id): id is string => Boolean(id)),
    [resolvedColumns],
  );

  // Owned here, not in the popover: react-table needs `columnVisibility` in its own state or
  // the persisted choice drives the checkboxes and nothing else — a column the user hid came
  // back on reload with its box still unchecked.
  // The session's subject (user or vendor id), so a shared browser keeps each person's layout.
  const sessionId = useAppSelector((state) => state.auth.user?.sub ?? state.vendorAuth.vendor?.sub);
  const {
    visibility,
    setVisibility,
    order: savedOrder,
    setOrder,
    sizing: savedSizing,
    setSizing,
    reset: resetColumnConfig,
  } = useTableColumnConfig(configNamespace, columnIds, sessionId);
  // Only widths for columns that still exist, clamped — a layout saved before an admin hid or
  // renamed a column can neither resurrect it nor carry a stale value.
  const columnSizing = React.useMemo(
    () => reconcileSizing(savedSizing, columnIds),
    [savedSizing, columnIds],
  );

  /**
   * Any state change that narrows the result set has to return to page 0.
   *
   * TanStack's own `_autoResetPageIndex` is gated on `!manualPagination`, so in server mode it
   * never fires: filtering while on page 3 requested page 3 OF THE FILTERED SET and rendered
   * an empty table, which reads as "no matches" rather than "wrong page". Resetting inside the
   * change handlers rather than in an effect avoids fetching the doomed page first.
   */
  const resetPage = () =>
    setPagination((prev) => (prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 }));

  const clearFilters = () => {
    setColumnFilters([]);
    setPanelFilters({});
    setSearch("");
    setFilterResetKey((prev) => prev + 1);
    resetPage();
  };

  /**
   * `tableId` changing means the underlying DATASET changed — every scoped master screen
   * folds its franchise/branch scope into `tableId` for exactly this reason (see the query
   * key below and Metadata.tsx's own comment on its values table). A filter set against the
   * OLD scope must not silently ride along to the new one: a Branch filter holding franchise
   * A's branch id, applied to franchise B's query, filters out every one of B's real rows —
   * which reads as "no matching records" for data that plainly exists.
   *
   * Reset happens DURING render, not in a `useEffect` — React's own pattern for "adjust state
   * when a prop changes". An effect runs AFTER the render that already built `fetchOptions`/
   * `useQuery`'s `queryKey` from the NEW `tableId` combined with the still-stale filter state,
   * so the query for the new dataset briefly fires with the old scope's filter values attached
   * — one extra, mis-scoped request per switch, superseded a tick later by the effect's own
   * correction. Resetting here means the very first render with the new `tableId` already has
   * cleared filters, so that mis-scoped query is never built at all. `useState` (not a `ref`)
   * is what makes the comparison happen safely during render — React re-runs this render
   * immediately when the setter below actually changes state, and bails out once
   * `previousTableId === tableId` again, so this can never loop.
   *
   * `rowSelection`/`expandedIds` are cleared here too, alongside the filters `clearFilters`
   * already resets — a stale selection can't resolve to a wrong-tenant ROW after the switch
   * (`getRowId` keys off the row's own id), but `selectedCount` counts raw keys regardless of
   * whether they match anything in the new table, so the "N selected" bar could show a stale,
   * non-zero count with nothing actually checked on screen.
   */
  const [previousTableId, setPreviousTableId] = React.useState(tableId);
  if (previousTableId !== tableId) {
    setPreviousTableId(tableId);
    clearFilters();
    setRowSelection({});
    setExpandedIds(new Set());
  }

  const filterFields = tableFilterComponents?.(panelFilters) ?? [];

  const sortEntry = sorting[0];
  const sortField = sortEntry
    ? (resolvedColumns.find((column) => (column as { id?: string }).id === sortEntry.id)?.meta
        ?.filterField ?? sortEntry.id)
    : undefined;

  const fetchOptions: FetchOptions = {
    pageIndex: pagination.pageIndex,
    pageSize: pagination.pageSize,
    search: search || undefined,
    sort: sortField,
    sortDir: sortEntry ? (sortEntry.desc ? "desc" : "asc") : undefined,
    filters: [
      ...columnFilters.map((filter) => {
        // Resolved from the column itself, so an `accessorKey`-only column keeps its variant.
        // The old lookup compared `column.id` and silently lost it for every such column,
        // sending a range or a multiselect with the wrong operator.
        // By the column's own id — `filter.id` is TanStack's key for it. Comparing against
        // `fieldNameOf` (which already resolves `meta.filterField`) never matched a column that
        // sets one, so its `filterField` was never applied and the id was sent instead.
        const column = resolvedColumns.find(
          (candidate) => columnIdOf(candidate as Parameters<typeof columnIdOf>[0]) === filter.id,
        );
        return {
          field: column?.meta?.filterField ?? filter.id,
          value: filter.value,
          filterType: "column",
          variant: column?.meta?.filterVariant,
        };
      }),
      // The panel field's declared TYPE decides the operator, so a `dateRange` becomes one
      // `between` here rather than being hand-folded from `_from`/`_to` inside every screen's
      // own `fetchData` — which is what v4 has to do, since it sends every panel filter as
      // `equals`.
      ...Object.entries(panelFilters)
        .filter(([, value]) => isActiveFilterValue(value))
        .map(([id, value]) => {
          const field = filterFields.find((entry) => entry.id === id);
          return {
            field: field ? panelFieldName(field) : id,
            value,
            filterType: "panel",
            variant: panelFilterVariant(field?.type),
          };
        }),
    ],
  };

  const query = useQuery({
    queryKey: ["table-data", tableId, fetchOptions],
    queryFn: () => fetchData!(fetchOptions),
    enabled: isServerMode,
    placeholderData: keepPreviousData,
    /*
     * Always re-read when a list mounts. The app's 10s default let a screen show rows another
     * screen had just changed (a vehicle resolved out of Breakdown still read "Breakdown" on
     * Transport Assets); the cached page still shows at once, and is replaced when fresh.
     */
    staleTime: 0,
  });

  React.useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (refreshTrigger !== undefined) {
      setRowSelection({});
      query.refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  const rows = isServerMode ? (query.data?.rows ?? []) : (data ?? []);
  const isLoading = isServerMode ? query.isFetching && !query.data : (externalLoading ?? false);
  // Server mode only: client mode has no fetch of its own to fail. `placeholderData:
  // keepPreviousData` means a refetch that fails still holds the previous page's rows, so
  // this deliberately requires BOTH the error and an empty result set — a background
  // refetch failing should not blank out data the user is already reading.
  const fetchFailed = isServerMode && query.isError && rows.length === 0;

  const selectionColumn: ColumnDef<TData, unknown> | null = showRowSelectionColumn
    ? {
        id: SELECT_COLUMN_ID,
        header: ({ table }) => (
          <IndeterminateCheckbox
            checked={table.getIsAllRowsSelected()}
            indeterminate={table.getIsSomeRowsSelected()}
            onCheckedChange={(checked) => table.toggleAllRowsSelected(checked)}
            aria-label={t("table.selectAll")}
          />
        ),
        cell: ({ row }) => (
          <IndeterminateCheckbox
            checked={row.getIsSelected()}
            onCheckedChange={(checked) => row.toggleSelected(checked)}
            // The row number matters: without it every checkbox in the table has the SAME
            // accessible name, so a screen reader announces "Select row" N times with nothing
            // to tell them apart.
            aria-label={t("table.selectRow", { row: row.index + 1 })}
          />
        ),
        size: SELECT_COLUMN_SIZE,
        meta: { align: "center" },
        enableResizing: false,
        enableSorting: false,
        enableHiding: false,
      }
    : null;

  const expandColumn: ColumnDef<TData, unknown> | null = getRowCanExpand
    ? {
        id: EXPAND_COLUMN_ID,
        header: () => null,
        cell: ({ row }) => {
          if (!getRowCanExpand(row.original)) return null;
          const isExpanded = expandedIds.has(row.id);
          return (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              aria-label={isExpanded ? t("table.collapseRow") : t("table.expandRow")}
              onClick={() =>
                setExpandedIds((prev) => {
                  const next = new Set(prev);
                  if (next.has(row.id)) next.delete(row.id);
                  else next.add(row.id);
                  return next;
                })
              }
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          );
        },
        size: EXPAND_COLUMN_SIZE,
        meta: { align: "center" },
        enableResizing: false,
        enableSorting: false,
        enableHiding: false,
      }
    : null;

  const allColumns = [expandColumn, selectionColumn, ...resolvedColumns].filter(
    Boolean,
  ) as ColumnDef<TData, unknown>[];

  // Computed from state directly (not from `table`) so `enableRowSelection` below doesn't
  // need to reference the table object it's being constructed as part of.
  const selectedSoFar = rows.filter(
    (row, index) => rowSelection[getRowId ? getRowId(row) : String(index)],
  );

  // The utility columns lead; the rest follow the user's saved order, which is the franchise's
  // Field Config order until they drag a header.
  const columnOrder = React.useMemo(
    () => [
      ...(getRowCanExpand ? [EXPAND_COLUMN_ID] : []),
      ...(showRowSelectionColumn ? [SELECT_COLUMN_ID] : []),
      ...savedOrder,
    ],
    [getRowCanExpand, showRowSelectionColumn, savedOrder],
  );
  const handleMoveColumn = (activeId: string, overId: string) =>
    setOrder(moveColumn(savedOrder, activeId, overId));

  const table = useReactTable<TData>({
    data: rows,
    columns: allColumns,
    state: {
      pagination,
      columnFilters,
      rowSelection,
      sorting,
      columnVisibility: visibility,
      columnSizing,
      columnOrder,
    },
    // Resizing is driven by `ColumnResizer`, which commits one width per gesture; react-table
    // only stores and reads the result, so no per-pointer-move state ever reaches the rows.
    enableColumnResizing: true,
    columnResizeMode: "onEnd",
    onColumnSizingChange: (updater) => {
      const next: ColumnSizingState =
        typeof updater === "function" ? updater(columnSizing) : updater;
      setSizing(next);
    },
    getRowId,
    manualPagination: isServerMode,
    manualFiltering: isServerMode,
    manualSorting: isServerMode,
    // One sort column: the server takes a single `sort`, so offering shift-click multi-sort
    // would build a state it cannot express.
    enableMultiSort: false,
    // Otherwise react-table infers a descending-first cycle per column type, and two adjacent
    // headers sort in opposite directions on their first click.
    defaultColumn: { sortDescFirst: false },
    // With a default order a header click flips ascending/descending; without one the third click
    // hands the ordering back to the server's own default (see `SortableHeader`).
    enableSortingRemoval: !defaultSort,
    pageCount: isServerMode ? (query.data?.pageCount ?? -1) : undefined,
    onPaginationChange: setPagination,
    onColumnFiltersChange: (updater) => {
      setColumnFilters(updater);
      resetPage();
    },
    onSortingChange: (updater) => {
      setSorting(updater);
      resetPage();
    },
    onColumnVisibilityChange: (updater) => {
      const next =
        typeof updater === "function" ? (updater(visibility) as VisibilityState) : updater;
      setVisibility(next as Record<string, boolean>);
    },
    onRowSelectionChange: setRowSelection,
    enableRowSelection: getRowCanSelect
      ? (row) => getRowCanSelect(row.original, selectedSoFar)
      : true,
    getCoreRowModel: getCoreRowModel(),
    ...(isServerMode
      ? {}
      : {
          getPaginationRowModel: getPaginationRowModel(),
          getFilteredRowModel: getFilteredRowModel(),
          getSortedRowModel: getSortedRowModel(),
        }),
  });

  const selectedRows = table.getSelectedRowModel().rows.map((r) => r.original);
  const selectedCount = Object.keys(rowSelection).length;

  const actionContext = {
    refetch: () => query.refetch(),
    rowSelection,
    fetchOptions,
    selectedRows,
  };

  const handleDownloadAll = async () => {
    if (!downloadAllConfig) return;
    const blob = await downloadAllConfig.onDownload();
    downloadBlob(
      blob,
      downloadAllConfig.filename ?? `download-${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  };

  const activePanelCount = Object.values(panelFilters).filter(isActiveFilterValue).length;
  const activeFilterCount = columnFilters.length + activePanelCount + (search ? 1 : 0);

  // Only render the filter row when something in it is actually filterable. `TableHead` is
  // `h-10`, so an unconditional row cost every table a 40px empty band.
  const hasColumnFilters = table
    .getVisibleLeafColumns()
    .some((column) => column.getCanFilter() && column.columnDef.meta?.filterVariant);

  return (
    // A grid, not a flex column, on purpose. Its table row is `minmax(12rem, 1fr)`: in a bounded
    // frame that row takes what the toolbar and pagination leave and the table scrolls inside it
    // (`shrink`, because a page root's children do not by default), never below 12rem even if
    // the rest of the page is tall; with no bounded ancestor the row is as tall as the rows.
    // `grow` fills the frame, so even a short table keeps its pagination pinned to the bottom.
    // `frame-fill` marks it for index.css, which turns whatever wraps it into the bounded chain.
    <div className="frame-fill grid min-h-0 grow shrink grid-rows-[auto_auto_minmax(12rem,1fr)_auto]">
      <div className="row-start-1">
        <TableToolbar
          search={
            showSearch
              ? {
                  value: search,
                  onChange: (value) => {
                    setSearch(value);
                    resetPage();
                  },
                }
              : undefined
          }
          activeFilterCount={activeFilterCount}
          onClearFilters={clearFilters}
          resetKey={filterResetKey}
          leading={
            <>
              {toolbarFilter}
              {filterFields.length > 0 ? (
                <TableFilterPanel
                  fields={filterFields}
                  activeFilters={panelFilters}
                  onApply={(next) => {
                    setPanelFilters(next);
                    resetPage();
                  }}
                  onClear={() => {
                    setPanelFilters({});
                    resetPage();
                  }}
                />
              ) : null}
            </>
          }
          trailing={
            <>
              {/*
               * Handed the SAME `fetchOptions` the list request is built from, so the screen's
               * `buildExportParams` call cannot describe a different set of rows from the one on
               * screen.
               */}
              {renderBulkActions?.(fetchOptions, selectedRows)}
              {bulkUploadConfig && (
                <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}>
                  {bulkUploadConfig.label ?? t("table.bulkUpload")}
                </Button>
              )}
              {downloadAllConfig && (
                <Button variant="outline" size="sm" onClick={handleDownloadAll}>
                  {downloadAllConfig.label ?? t("table.downloadAll")}
                </Button>
              )}
              {configNamespace && (
                <ColumnVisibilityPopover
                  table={table}
                  onReset={resetColumnConfig}
                  onMove={handleMoveColumn}
                />
              )}
              <ActionsToolbar
                primaryActions={hideActionsIfNoPermission && permission ? [] : primaryActions}
                secondaryActions={secondaryActions}
                context={actionContext}
              />
            </>
          }
        />
      </div>

      <div className="row-start-2 empty:hidden [&>*]:mt-3">
        <RowSelectionBar count={selectedCount} onClear={() => setRowSelection({})} />
      </div>

      {/* A size container, so the empty/error body below can size itself with `cqw`. */}
      <div className="row-start-3 mt-3 flex min-h-0 flex-col rounded-lg border border-border [container-type:inline-size]">
        <Table
          containerClassName="min-h-0 flex-1"
          // Fixed layout at the sum of the column widths: the browser stops squeezing columns to
          // fit, so cells stay one line and the wrapper scrolls sideways. `minWidth` keeps a
          // narrow table filling its frame.
          className="table-fixed"
          style={{ width: table.getTotalSize(), minWidth: "100%" }}
        >
          {/* Sticky, so the column titles stay put while the body scrolls. */}
          <TableHeader className="sticky top-0 z-10 bg-background shadow-[0_1px_0_hsl(var(--border))]">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const content = (
                    <>
                      {header.isPlaceholder ? null : (
                        <div className="min-w-0 overflow-hidden text-ellipsis">
                          {header.column.getCanSort() ? (
                            <SortableHeader column={header.column}>
                              {flexRender(header.column.columnDef.header, header.getContext())}
                            </SortableHeader>
                          ) : (
                            flexRender(header.column.columnDef.header, header.getContext())
                          )}
                        </div>
                      )}
                      {header.column.getCanResize() && !header.isPlaceholder && (
                        <ColumnResizer
                          width={header.getSize()}
                          side={header.column.columnDef.meta?.pin === "right" ? "left" : "right"}
                          label={columnTitle(header.column)}
                          onResize={(width) =>
                            setSizing({ ...columnSizing, [header.column.id]: width })
                          }
                          onReset={() => setSizing(withoutColumn(columnSizing, header.column.id))}
                        />
                      )}
                    </>
                  );
                  const cellProps = {
                    style: { width: header.getSize() },
                    "aria-sort": ariaSortFor(header.column),
                    // A column's own `meta.className` (e.g. a `min-w-[…]` floor) has to land
                    // on the HEADER cell, not just the data cell — `TableCell` already reads
                    // this, but the header never did, so a column had no way to claim a
                    // minimum width and every wide table let the browser's auto table layout
                    // squeeze headers and search boxes down to nothing before it wrapped.
                    className: cn("relative", columnClass(header.column.columnDef.meta)),
                  };
                  return isDraggableHeader(header) ? (
                    <DraggableHead
                      key={header.id}
                      columnId={header.column.id}
                      onMoveColumn={handleMoveColumn}
                      {...cellProps}
                    >
                      {content}
                    </DraggableHead>
                  ) : (
                    <TableHead key={header.id} {...cellProps}>
                      {content}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
            {hasColumnFilters &&
              table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={`${headerGroup.id}-filters`}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      style={{ width: header.getSize() }}
                      className={cn(
                        "h-auto py-1.5 align-top",
                        columnClass(header.column.columnDef.meta),
                      )}
                    >
                      {header.column.columnDef.meta?.filterVariant &&
                        header.column.getCanFilter() && (
                          <Filter
                            column={header.column}
                            columnFilterPlaceholder={columnFilterPlaceholder}
                            resetKey={filterResetKey}
                          />
                        )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: pagination.pageSize }).map((_, index) => (
                <TableRow key={index}>
                  {/* One skeleton PER COLUMN, not one colSpan-wide bar: the loading state
                      should be the shape of the table that replaces it. */}
                  {table.getVisibleLeafColumns().map((column) => (
                    <TableCell key={column.id}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length ? (
              rowGroupConfig ? (
                table.getRowModel().rows.map((row) => {
                  const childRows = rowGroupConfig.getChildRows(row.original) ?? [];
                  return (
                    <React.Fragment key={row.id}>
                      <TableRow className="bg-muted/40">
                        <TableCell colSpan={allColumns.length}>
                          {rowGroupConfig.renderGroupHeader(row.original, childRows)}
                        </TableCell>
                      </TableRow>
                      {childRows.map((childRow, childIndex) => (
                        <TableRow key={childIndex}>
                          <TableCell colSpan={allColumns.length}>
                            {rowGroupConfig.renderChildRow(childRow, row.original)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
                  );
                })
              ) : (
                table.getRowModel().rows.map((row) => {
                  const isExpanded = expandedIds.has(row.id);
                  return (
                    <React.Fragment key={row.id}>
                      <TableRow data-state={row.getIsSelected() ? "selected" : undefined}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            onMouseEnter={titleIfTruncated}
                            className={cn(
                              cellAlignClass(cell.column.columnDef.meta),
                              columnClass(cell.column.columnDef.meta),
                              cell.column.columnDef.meta?.wrap && "whitespace-normal",
                            )}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                      {isExpanded && renderSubRow && (
                        <TableRow>
                          <TableCell colSpan={allColumns.length}>
                            {renderSubRow(row.original, isExpanded)}
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })
              )
            ) : (
              <TableRow>
                <TableCell colSpan={allColumns.length} className="h-32 text-center">
                  {/*
                   * Sticky and exactly as wide as the VISIBLE scrollport, so the message
                   * follows horizontal scroll and is centred in what the user can see.
                   *
                   * The cell spans every column, so on a wide table it is far wider than the
                   * scrollport — Transport Assets measures 3719px against a 922px view — and
                   * a body centred inside the cell put "No results." at x≈2105 with the
                   * viewport ending at 1244: a blank box, and the ERROR body's Retry went
                   * with it. A `w-fit` wrapper fixed that but hugged the left edge.
                   *
                   * `100cqw` is the bordered container's inner width (= the scrollport), less
                   * the cell's `p-2` on both sides; `left-2` keeps that inset while scrolled.
                   * A full-width child would have nothing to slide against, so the width must
                   * come from the scrollport, never from the cell.
                   */}
                  <div className="sticky left-2 w-[calc(100cqw-1rem)]">
                    {fetchFailed ? (
                      <ErrorTable error={query.error} onRetry={() => void query.refetch()} />
                    ) : (
                      (emptyState ?? <EmptyTable message={emptyMessage} />)
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Kept mounted at zero rows: filtering down to nothing used to unmount the controls,
          so there was no way to page back out of a page that no longer exists — and the row
          disappearing shifted everything below it. */}
      {isLoading ? (
        <div className="row-start-4 mt-3">
          <TablePaginationSkeleton />
        </div>
      ) : (
        !fetchFailed && (
          <div className="row-start-4 mt-3">
            <TablePagination
              table={table}
              totalCount={isServerMode ? query.data?.totalCount : undefined}
              totalCapped={isServerMode && query.data?.totalCapped}
            />
          </div>
        )
      )}

      {bulkUploadConfig && (
        <BulkUploadDialog
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          config={bulkUploadConfig}
          onDone={() => {
            setUploadOpen(false);
            query.refetch();
          }}
        />
      )}
    </div>
  );
}
