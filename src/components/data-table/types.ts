import type { RowData } from "@tanstack/react-table";
import type { PermissionRequirement } from "@/lib/permissions";

export type FilterOption = { value: string | number | boolean; label: string };

export type FilterVariant = "text" | "select" | "multiselect" | "dateRange" | "numberRange";

export interface ColumnFilterMeta {
  filterVariant?: FilterVariant;
  filterOptions?: FilterOption[];
  /**
   * What the UNFILTERED state of a `select` is called, in place of "All".
   *
   * Only for a column whose default view is not "everything": the shared Status column hides
   * inactive rows until asked, so its untouched state is "Active" and "All" is a real option
   * (`ALL_STATUSES_FILTER_VALUE`). Every other select keeps "All" for no filter.
   */
  filterUnsetLabel?: string;
  numberProps?: { min?: number; max?: number; step?: number };
  /**
   * The backend field name, when it differs from the column id.
   *
   * A column often DISPLAYS one thing and FILTERS another — Users shows `franchiseName` in a
   * column keyed `franchiseId`. Ported from v4's `meta.filterField`. Both the filter payload
   * and the `LIST_FIELDS` lookup that decides whether a column is sortable/filterable resolve
   * through `filterField ?? column.id`, so the two can never disagree.
   */
  filterField?: string;
}

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> extends ColumnFilterMeta {
    className?: string;
    /**
     * Keeps the column in view at the table's right edge while the rest scrolls sideways — for a
     * row's actions, which otherwise sit in the last column, out of sight on a wide table.
     */
    pin?: "right";
    /**
     * Lets this column's cells wrap onto several lines. Every cell is a single truncated line by
     * default so rows stay one height; a long free-text column opts out here.
     */
    wrap?: boolean;
    /**
     * Cell alignment (titles are always centred). Centred by default (see `column-alignment.ts`);
     * set it to override, e.g. `"left"` on a long description or `"right"` on an amount.
     */
    align?: "left" | "center" | "right";
  }
}

export interface FetchOptions {
  pageIndex: number;
  pageSize: number;
  /** Free-text search across the entity's searchable columns — the toolbar search box. */
  search?: string;
  /**
   * The field the user sorted by, already resolved through `meta.filterField`. Absent when
   * the user has not chosen a sort, so the screen's own default still applies.
   */
  sort?: string;
  sortDir?: "asc" | "desc";
  /**
   * `variant` is the column's declared `filterVariant`, carried through so a server
   * adapter can pick the right operator. Without it a two-item multiselect
   * (`["en","hi"]`) is indistinguishable by shape from a two-ended range, and one of
   * them silently gets the wrong SQL.
   */
  filters: {
    field: string;
    value: unknown;
    filterType: string;
    variant?: FilterVariant;
  }[];
}

export interface FetchResult<TData> {
  rows: TData[];
  pageCount: number;
  totalCount?: number;
  /** The server stopped counting at a cap, so `totalCount` is a lower bound ("10000+"). */
  totalCapped?: boolean;
}

export interface TableActionContext<TData> {
  refetch: () => void;
  rowSelection: Record<string, boolean>;
  fetchOptions: FetchOptions;
  selectedRows: TData[];
}

export interface TableAction<TData> {
  label: string;
  icon?: React.ReactNode;
  onClick: (ctx: TableActionContext<TData>) => void;
  disabled?: (rowSelection: Record<string, boolean>) => boolean;
  hidden?: (rowSelection: Record<string, boolean>) => boolean;
  /** Gated via usePermission().has(...). */
  permission?: PermissionRequirement;
  /** Default true, matches the old PermissionButton default. */
  hideIfNoPermission?: boolean;
}

export interface DownloadAllConfig {
  label?: string;
  onDownload: () => Promise<Blob>;
  filename?: string;
}

export interface BulkUploadConfig {
  label?: string;
  accept?: string;
  onUpload: (
    file: File,
  ) => Promise<{ success: number; errors?: { row: number; message: string }[] }>;
}

export interface RowGroupConfig<TData> {
  getChildRows: (row: TData) => TData[] | undefined;
  renderGroupHeader: (row: TData, childRows: TData[]) => React.ReactNode;
  renderChildRow: (childRow: TData, parentRow: TData) => React.ReactNode;
}

/**
 * One field in the page-level filter panel.
 *
 * `type` picks the control AND the operator: the panel renders through `FormGenerator` (the
 * one Form Builder — see `.claude/rules/quality.md`) and hands the value back tagged with its
 * variant, so `masters-api.ts`'s `toFilter` can turn a `dateRange` into a single `between`
 * centrally. v4 sends every panel filter as `equals` and each table hand-folds its
 * `_from`/`_to` phantom fields inside `fetchData` — duplicated logic its own comments flag as
 * the largest in the component. Doing it here means a screen declares a range and stops.
 */
export interface TableFilterField {
  id: string;
  label: string;
  type: "text" | "select" | "multiselect" | "dateRange" | "number";
  options?: FilterOption[];
  placeholder?: string;
  /** Backend field name when it differs from `id` — same role as `ColumnFilterMeta.filterField`. */
  filterField?: string;
}
