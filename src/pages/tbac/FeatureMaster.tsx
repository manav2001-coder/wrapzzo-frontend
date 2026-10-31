import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { LIST_FIELDS } from "@/lib/list-fields";
import type { Feature } from "@/types/tbac";

import { DataTable } from "@/components/data-table";
import { IconButton } from "@/components/icon-button";
import { PermissionGate } from "@/components/access-control/permission-gate";
import { useCompanyScope } from "@/components/masters/company-scope-select";
import { MasterPageHeader, SystemBadge, useAuditColumns } from "@/components/masters/master-page";
import { BulkFeatureRegisterDialog } from "@/components/tbac/bulk-feature-register-dialog";
import { ToggleActiveDialog } from "@/components/tbac/toggle-active-dialog";
import { useApiErrorToast } from "@/hooks/use-api-error-toast";
import { useFieldConfig } from "@/hooks/use-field-config";
import { setResource, tableFetcher } from "@/lib/masters-api";

const PATH = "/api/tbac/features";

/**
 * Feature Master — v4's `/tbac/feature-master`.
 *
 * The catalogue of permissions THIS franchise has registered. Templates are built from these
 * rows, and deactivating one revokes it everywhere at once.
 *
 * There is no edit form and no delete, matching v4. A feature's key is what route guards
 * match on, so renaming it in place would silently strip access from every template already
 * holding it; and hard-deleting it would shrink those templates without saying so. The only
 * row action is the activate/deactivate toggle.
 */
export default function FeatureMasterPage() {
  const { t } = useTranslation(["tbac", "common"]);
  const showError = useApiErrorToast();
  const { statusColumn, addedColumns } = useAuditColumns<Feature>();
  const scope = useCompanyScope();
  const { applyToColumns } = useFieldConfig("feature");

  const [refreshTrigger, setRefreshTrigger] = React.useState(0);
  const [registerOpen, setRegisterOpen] = React.useState(false);
  const [pending, setPending] = React.useState<Feature | null>(null);
  const [busy, setBusy] = React.useState(false);

  const fetchFeatures = React.useMemo(
    () => tableFetcher<Feature>(PATH, scope.companyId ? { companyId: scope.companyId } : {}),
    [scope.companyId],
  );

  async function toggleActive() {
    if (!pending) return;
    setBusy(true);
    try {
      await setResource(`${PATH}/${pending.id}`, { active: !pending.active });
      toast.success(pending.active ? t("featureMaster.deactivated") : t("featureMaster.activated"));
      setPending(null);
      setRefreshTrigger((n) => n + 1);
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }

  const columns: ColumnDef<Feature, unknown>[] = React.useMemo(
    () =>
      applyToColumns<Feature>([
        {
          id: "moduleName",
          accessorKey: "moduleName",
          header: t("featureMaster.fields.moduleName"),
          cell: ({ row }) => (
            <span className="flex items-center gap-2">
              {row.original.moduleName}
              {row.original.isSystem && <SystemBadge />}
            </span>
          ),
        },
        {
          id: "key",
          accessorKey: "key",
          header: t("featureMaster.fields.key"),
          cell: ({ row }) => <span className="font-mono text-xs">{row.original.key}</span>,
        },
        {
          id: "actionName",
          accessorKey: "actionName",
          header: t("featureMaster.fields.actionName"),
        },
        {
          id: "description",
          accessorKey: "description",
          header: t("featureMaster.fields.description"),
          cell: ({ row }) => row.original.description ?? "-",
        },
        statusColumn,
        ...addedColumns,
        {
          id: "actions",
          header: t("field.actions", { ns: "common" }),
          enableColumnFilter: false,
          enableSorting: false,
          cell: ({ row }) => (
            <PermissionGate permission="tbac.feature_master.edit">
              <IconButton
                icon={row.original.active ? Trash2 : CheckCircle2}
                label={
                  row.original.active
                    ? t("action.deactivate", { ns: "common" })
                    : t("action.confirm", { ns: "common" })
                }
                variant={row.original.active ? "destructive" : "default"}
                onClick={() => setPending(row.original)}
              />
            </PermissionGate>
          ),
        },
      ]),
    [t, statusColumn, addedColumns, applyToColumns],
  );

  return (
    <div className="p-6">
      <MasterPageHeader
        title={t("featureMaster.title")}
        description={t("featureMaster.subtitle")}
        createLabel={t("featureMaster.bulkRegister")}
        createPermission="tbac.feature_master.add"
        extra={scope.control}
        onCreate={() => setRegisterOpen(true)}
      />

      <DataTable<Feature>
        tableId={`tbac-features-${scope.companyId ?? "all"}`}
        listFields={LIST_FIELDS.feature}
        configNamespace="tbac.features"
        columns={columns}
        fetchData={fetchFeatures}
        getRowId={(row) => row.id}
        showRowSelectionColumn={false}
        refreshTrigger={refreshTrigger}
        permission="tbac.feature_master.view"
      />

      <BulkFeatureRegisterDialog
        open={registerOpen}
        onOpenChange={setRegisterOpen}
        companyId={scope.companyId}
        onRegistered={() => setRefreshTrigger((n) => n + 1)}
      />

      <ToggleActiveDialog
        open={pending !== null}
        active={pending?.active}
        keyPrefix="featureMaster"
        busy={busy}
        onCancel={() => setPending(null)}
        onConfirm={toggleActive}
      >
        {pending && <p className="font-mono text-xs text-muted-foreground">{pending.key}</p>}
      </ToggleActiveDialog>
    </div>
  );
}
