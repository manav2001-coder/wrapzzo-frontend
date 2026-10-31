import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Power, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import { useHasAccess } from "@/hooks/use-permission";
import { AppDialog } from "@/components/app-dialog";
import { Button } from "@/components/ui/button";
import { Dot } from "@/components/dot";
import { IconButton } from "@/components/icon-button";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/datetime";
import { allStatusesFilterOption } from "@/lib/list-filter";
import { useUserTimezone } from "@/hooks/use-user-timezone";
import type { PermissionRequirement } from "@/lib/permissions";

/**
 * Page heading + a primary action, shared by every list screen (MobixFL's `MasterPageHeader`).
 *
 * The create button is permission-gated: a user who cannot create should not be offered a form
 * that will 403 on save.
 */
export function MasterPageHeader({
  title,
  description,
  createLabel,
  createPermission,
  onCreate,
  extra,
  lead,
}: {
  title: string;
  description?: string;
  /** Beside the title, e.g. a company logo. */
  lead?: React.ReactNode;
  createLabel?: string;
  createPermission?: PermissionRequirement;
  onCreate?: () => void;
  extra?: React.ReactNode;
}) {
  const allowCreate = useHasAccess(createPermission);
  const canCreate = onCreate && allowCreate;

  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
      <div className="flex min-w-0 items-center gap-2.5">
        {lead}
        <div className="min-w-0">
          <h1 className="text-[15px] font-semibold tracking-tight">{title}</h1>
          {description && <p className="mt-0.5 text-[11.5px] text-muted-foreground">{description}</p>}
        </div>
      </div>
      <div className="flex max-w-full flex-wrap items-end gap-2">
        {extra}
        {canCreate && (
          <Button onClick={onCreate} size="sm" className="h-9 shrink-0" data-testid="master-create">
            <Plus />
            {createLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Active/inactive pill. A dot plus a word, so it does not rely on colour alone. `label` overrides
 * the word for an entity with its own vocabulary (a vendor is "Suspended", not "Inactive").
 */
export function StatusCell({ active, label }: { active: boolean; label?: string }) {
  const { t } = useTranslation();
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <Dot color={active ? "success" : "secondary"} />
      <span className={cn(!active && "text-muted-foreground")}>
        {label ?? (active ? t("field.active") : t("field.inactive"))}
      </span>
    </span>
  );
}

/** Everything a master row has in common, whatever the entity. */
export interface AuditedRow {
  id: string;
  active?: boolean;
  // Optional so a row type that only ever renders the Status column still satisfies this.
  addedOn?: string | null;
  addedByName?: string | null;
  updatedOn?: string | null;
  updatedByName?: string | null;
}

/** The "System" marker on a shared, company-immutable row. */
export function SystemBadge({ title }: { title?: string }) {
  const { t } = useTranslation();
  return (
    <Badge variant="secondary" title={title}>
      {t("field.system")}
    </Badge>
  );
}

/**
 * The `Status` and audit columns every Access Control listing shares (MobixFL's `useAuditColumns`).
 * `addedColumns` and `updatedColumns` come back separately for Feature Master, which shows only the
 * added pair.
 */
export function useAuditColumns<T extends AuditedRow>(): {
  statusColumn: ColumnDef<T, unknown>;
  addedColumns: ColumnDef<T, unknown>[];
  updatedColumns: ColumnDef<T, unknown>[];
  auditColumns: ColumnDef<T, unknown>[];
} {
  const { t } = useTranslation();
  const timeZone = useUserTimezone();

  const statusColumn: ColumnDef<T, unknown> = {
    id: "active",
    accessorKey: "active",
    header: t("field.status"),
    meta: {
      className: "min-w-[120px]",
      filterVariant: "select",
      // The untouched list is the ACTIVE rows; "All" is its own option that asks for both.
      filterUnsetLabel: t("field.active"),
      filterOptions: [
        { value: false, label: t("field.inactive") },
        allStatusesFilterOption(t("table.filterAll")),
      ],
    },
    cell: ({ row }) => <StatusCell active={row.original.active ?? false} />,
  };

  const addedColumns: ColumnDef<T, unknown>[] = [
    {
      id: "addedOn",
      accessorKey: "addedOn",
      header: t("audit.addedOn"),
      enableColumnFilter: false,
      meta: { className: "min-w-[160px]" },
      cell: ({ row }) => formatDateTime(row.original.addedOn, { timeZone }),
    },
    {
      id: "addedByName",
      accessorKey: "addedByName",
      header: t("audit.addedBy"),
      meta: { className: "min-w-[140px]" },
      cell: ({ row }) => row.original.addedByName ?? "-",
    },
  ];

  const updatedColumns: ColumnDef<T, unknown>[] = [
    {
      id: "updatedOn",
      accessorKey: "updatedOn",
      header: t("audit.updatedOn"),
      enableColumnFilter: false,
      meta: { className: "min-w-[160px]" },
      cell: ({ row }) => formatDateTime(row.original.updatedOn, { timeZone }),
    },
    {
      id: "updatedByName",
      accessorKey: "updatedByName",
      header: t("audit.updatedBy"),
      meta: { className: "min-w-[140px]" },
      cell: ({ row }) => row.original.updatedByName ?? "-",
    },
  ];

  return { statusColumn, addedColumns, updatedColumns, auditColumns: [...addedColumns, ...updatedColumns] };
}

/**
 * The Status column and the trailing row actions every list screen shares, plus the confirm
 * dialog Deactivate goes through (MobixFL's `useMasterColumns`).
 *
 * Wrappzo's entities each spell "active" their own way (`status: "ACTIVE"`, `active: true`), so
 * the row's state comes from `isActive` and the words from `statusLabels`.
 *
 * Actions live in a column rather than in the selection toolbar because they act on ONE row; the
 * toolbar's act on the selection. The column is pinned to the right edge, so a wide table never
 * scrolls a record's only way in out of view.
 */
export function useMasterColumns<T>({
  isActive,
  statusLabels,
  onEdit,
  onDeactivate,
  onActivate,
  editPermission,
  deletePermission,
  extraActions,
  deactivateCopy,
}: {
  isActive: (row: T) => boolean;
  statusLabels?: { active: string; inactive: string };
  onEdit?: (row: T) => void;
  onDeactivate?: (row: T) => void | Promise<void>;
  /** Shown on INACTIVE rows only, gated on `editPermission`. */
  onActivate?: (row: T) => void | Promise<void>;
  editPermission?: PermissionRequirement;
  deletePermission?: PermissionRequirement;
  /** Extra row actions, rendered before edit and deactivate. The caller owns their gating. */
  extraActions?: (row: T) => React.ReactNode;
  /** Wording for an entity whose "deactivate" has its own name (suspending a vendor). */
  deactivateCopy?: { label: string; title: string; body: string };
}): {
  statusColumn: ColumnDef<T, unknown>;
  actionsColumn: ColumnDef<T, unknown>;
  /** Render this once, anywhere in the page. */
  deactivateDialog: React.ReactNode;
} {
  const { t } = useTranslation();
  const canEdit = useHasAccess(editPermission);
  const canDelete = useHasAccess(deletePermission);
  const activeLabel = statusLabels?.active ?? t("field.active");
  const inactiveLabel = statusLabels?.inactive ?? t("field.inactive");
  const deactivateLabel = deactivateCopy?.label ?? t("action.deactivate");

  // A misclick on Deactivate must not change a live record at once: it goes through a confirm.
  const [pendingRow, setPendingRow] = React.useState<T | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function handleConfirmDeactivate() {
    if (!pendingRow) return;
    setBusy(true);
    try {
      await onDeactivate?.(pendingRow);
    } catch {
      // Callers report their own failure (a toast); the dialog closes either way.
    } finally {
      setBusy(false);
      setPendingRow(null);
    }
  }

  const statusColumn: ColumnDef<T, unknown> = {
    id: "status",
    accessorFn: (row) => isActive(row),
    header: t("field.status"),
    // Client-side filtering on the boolean; `equals` so `false` is a value, not "no filter".
    filterFn: "equals",
    meta: {
      className: "min-w-[120px]",
      filterVariant: "select",
      filterOptions: [
        { value: true, label: activeLabel },
        { value: false, label: inactiveLabel },
      ],
    },
    cell: ({ row }) => {
      const active = isActive(row.original);
      return <StatusCell active={active} label={active ? activeLabel : inactiveLabel} />;
    },
  };

  const actionsColumn: ColumnDef<T, unknown> = {
    id: "actions",
    header: t("field.actions"),
    enableColumnFilter: false,
    enableSorting: false,
    meta: { className: "min-w-[110px]", pin: "right" },
    cell: ({ row }) => {
      const active = isActive(row.original);
      return (
        <div className="flex items-center justify-end gap-0.5">
          {extraActions?.(row.original)}
          {canEdit && onEdit && (
            <IconButton icon={Pencil} label={t("action.edit")} onClick={() => onEdit(row.original)} />
          )}
          {canEdit && onActivate && !active && (
            <IconButton
              icon={RotateCcw}
              label={t("action.activate")}
              onClick={() => void onActivate(row.original)}
            />
          )}
          {canDelete && onDeactivate && active && (
            <IconButton icon={Power} label={deactivateLabel} onClick={() => setPendingRow(row.original)} />
          )}
        </div>
      );
    },
  };

  const deactivateDialog: React.ReactNode = (
    <AppDialog
      open={pendingRow !== null}
      onOpenChange={(next) => !next && setPendingRow(null)}
      size="sm"
      title={deactivateCopy?.title ?? t("confirmDeactivate.title")}
      description={deactivateCopy?.body ?? t("confirmDeactivate.body")}
      confirmLabel={deactivateLabel}
      cancelLabel={t("action.cancel")}
      confirmVariant="destructive"
      loading={busy}
      onConfirm={handleConfirmDeactivate}
    />
  );

  return { statusColumn, actionsColumn, deactivateDialog };
}
