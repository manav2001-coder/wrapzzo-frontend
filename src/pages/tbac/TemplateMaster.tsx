import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2, Eye, Layers, Pencil, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { LIST_FIELDS } from "@/lib/list-fields";
import type { EffectiveFeatures, Template } from "@/types/tbac";

import { DataTable } from "@/components/data-table";
import { IconButton } from "@/components/icon-button";
import { PermissionGate } from "@/components/access-control/permission-gate";
import { useCompanyScope } from "@/components/masters/company-scope-select";
import { MasterPageHeader, SystemBadge, useAuditColumns } from "@/components/masters/master-page";
import { EffectiveFeaturesDialog } from "@/components/tbac/effective-features-dialog";
import { QuickCreateModuleTemplates } from "@/components/tbac/quick-create-module-templates";
import { ToggleActiveDialog } from "@/components/tbac/toggle-active-dialog";
import { useApiErrorToast } from "@/hooks/use-api-error-toast";
import { useFieldConfig } from "@/hooks/use-field-config";
import {
  deactivateResource,
  getResource,
  listAll,
  setResource,
  tableFetcher,
} from "@/lib/masters-api";

const PATH = "/api/tbac/templates";

/**
 * Template Master — v4's `/tbac/template-master`.
 *
 * The list and its lifecycle only. Which FEATURES a template carries, and which other
 * templates it includes, are separate screens under Assignments — v4 splits them the same
 * way, and it is the right split: the form here is four fields, while assigning features is
 * a two-panel transfer over a few hundred rows.
 *
 * Deactivate rather than delete, so audit history and any lingering reference still resolve.
 */
export default function TemplateMasterPage() {
  const { t } = useTranslation(["tbac", "common"]);
  const navigate = useNavigate();
  const showError = useApiErrorToast();
  const { statusColumn, auditColumns } = useAuditColumns<Template>();
  const scope = useCompanyScope();
  const { applyToColumns } = useFieldConfig("template");

  const [refreshTrigger, setRefreshTrigger] = React.useState(0);
  const [pending, setPending] = React.useState<Template | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [existingNames, setExistingNames] = React.useState<string[]>([]);
  const [viewing, setViewing] = React.useState<Template | null>(null);
  const [effective, setEffective] = React.useState<EffectiveFeatures>({
    direct: [],
    inherited: [],
  });

  const fetchTemplates = React.useMemo(
    () => tableFetcher<Template>(PATH, scope.companyId ? { companyId: scope.companyId } : {}),
    [scope.companyId],
  );

  // Quick Create needs to know which modules already have a template, INCLUDING inactive
  // ones — offering to create "User Master" when a deactivated one exists would just 409.
  const loadNames = React.useCallback(async () => {
    try {
      const rows = await listAll<Template>(PATH, {
        includeInactive: true,
        ...(scope.companyId ? { companyId: scope.companyId } : {}),
      });
      setExistingNames(rows.map((row) => row.name));
    } catch (error) {
      showError(error);
    }
  }, [scope.companyId, showError]);

  React.useEffect(() => {
    void loadNames();
  }, [loadNames, refreshTrigger]);

  // `useCallback` so the columns memo below can depend on it honestly. As a plain function
  // declaration it was rebuilt every render, so listing it would have defeated the memo —
  // which is why it was omitted, and why the linter was right to object.
  const openEffective = React.useCallback(
    async (template: Template) => {
      setViewing(template);
      setEffective({ direct: [], inherited: [] });
      try {
        setEffective(
          await getResource<EffectiveFeatures>(`${PATH}/${template.id}/effective-features`),
        );
      } catch (error) {
        showError(error);
      }
    },
    [showError],
  );

  async function toggleActive() {
    if (!pending) return;
    setBusy(true);
    try {
      if (pending.active) {
        await deactivateResource(`${PATH}/${pending.id}`);
        toast.success(t("templateMaster.deactivated"));
      } else {
        await setResource(`${PATH}/${pending.id}`, { active: true });
        toast.success(t("templateMaster.activated"));
      }
      setPending(null);
      setRefreshTrigger((n) => n + 1);
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }

  const columns: ColumnDef<Template, unknown>[] = React.useMemo(
    () =>
      applyToColumns<Template>([
        {
          id: "name",
          accessorKey: "name",
          header: t("templateMaster.fields.name"),
          cell: ({ row }) => (
            <span className="flex items-center gap-2">
              {row.original.name}
              {row.original.isSystem && <SystemBadge />}
            </span>
          ),
        },
        {
          id: "templateKey",
          accessorKey: "templateKey",
          header: t("templateMaster.fields.templateKey"),
          cell: ({ row }) => <span className="font-mono text-xs">{row.original.templateKey}</span>,
        },
        {
          id: "description",
          accessorKey: "description",
          header: t("templateMaster.fields.description"),
          cell: ({ row }) => row.original.description ?? "-",
        },
        statusColumn,
        ...auditColumns,
        {
          id: "actions",
          header: t("field.actions", { ns: "common" }),
          enableColumnFilter: false,
          enableSorting: false,
          cell: ({ row }) => {
            const template = row.original;
            return (
              <div className="flex items-center gap-0.5">
                <IconButton
                  icon={Layers}
                  label={t("templateMaster.fields.features")}
                  onClick={() => void openEffective(template)}
                />
                <IconButton
                  icon={Eye}
                  label={t("action.view", { ns: "common" })}
                  onClick={() => navigate(`/tbac/template-master/view/${template.id}`)}
                />
                {/* A system template is shared by every tenant and the API answers 403 —
                    so don't offer the action at all. */}
                {!template.isSystem && (
                  <PermissionGate permission="tbac.template_master.edit">
                    <IconButton
                      icon={Pencil}
                      label={t("action.edit", { ns: "common" })}
                      onClick={() => navigate(`/tbac/template-master/edit/${template.id}`)}
                    />
                    <IconButton
                      icon={template.active ? Trash2 : CheckCircle2}
                      label={
                        template.active
                          ? t("action.deactivate", { ns: "common" })
                          : t("action.confirm", { ns: "common" })
                      }
                      variant={template.active ? "destructive" : "default"}
                      onClick={() => setPending(template)}
                    />
                  </PermissionGate>
                )}
              </div>
            );
          },
        },
      ]),
    [t, statusColumn, auditColumns, applyToColumns, navigate, openEffective],
  );

  return (
    <div className="p-6">
      <MasterPageHeader
        title={t("templateMaster.title")}
        description={t("templateMaster.subtitle")}
        createLabel={t("templateMaster.create")}
        createPermission="tbac.template_master.add"
        extra={scope.control}
        onCreate={() => navigate("/tbac/template-master/create")}
      />

      <PermissionGate permission="tbac.template_master.add">
        <QuickCreateModuleTemplates
          existingNames={existingNames}
          companyId={scope.companyId}
          onCreated={() => setRefreshTrigger((n) => n + 1)}
        />
      </PermissionGate>

      <DataTable<Template>
        tableId={`tbac-templates-${scope.companyId ?? "all"}`}
        listFields={LIST_FIELDS.template}
        configNamespace="tbac.templates"
        columns={columns}
        fetchData={fetchTemplates}
        getRowId={(row) => row.id}
        showRowSelectionColumn={false}
        refreshTrigger={refreshTrigger}
        permission="tbac.template_master.view"
      />

      <EffectiveFeaturesDialog
        open={viewing !== null}
        onOpenChange={(open) => !open && setViewing(null)}
        title={viewing?.name ?? ""}
        direct={effective.direct}
        inherited={effective.inherited}
      />

      <ToggleActiveDialog
        open={pending !== null}
        active={pending?.active}
        keyPrefix="templateMaster"
        busy={busy}
        onCancel={() => setPending(null)}
        onConfirm={toggleActive}
      >
        {pending && <p className="text-sm text-muted-foreground">{pending.name}</p>}
      </ToggleActiveDialog>
    </div>
  );
}
