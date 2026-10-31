import * as React from "react";
import { Plus } from "lucide-react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { Role, Template } from "@/types/tbac";

import { PermissionButton } from "@/components/access-control/permission-button";
import { SectionCard } from "@/components/section-card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MasterPageHeader } from "@/components/masters/master-page";
import { MultiValueCombobox, type Option } from "@/components/masters/value-combobox";
import { AssignedTemplateList } from "@/components/tbac/assigned-template-list";
import { usePermissions } from "@/hooks/use-permission";
import { useApiErrorToast } from "@/hooks/use-api-error-toast";
import { useCompanyScope } from "@/components/masters/company-scope-select";
import { createResource, deactivateResource, getResource, listAll } from "@/lib/masters-api";

/**
 * One role's templates — v4's `/tbac/assignments/roles/[roleId]`.
 *
 * This screen IS the role's access. A role holds no permissions of its own, so everything
 * anyone with this role can do arrives through the list below.
 */
export default function RoleTemplateAssignPage() {
  const scope = useCompanyScope();
  const { t } = useTranslation(["tbac", "common", "masters"]);
  const { roleId } = useParams<{ roleId: string }>();
  const showError = useApiErrorToast();
  const { refetchPermissions } = usePermissions();

  const [role, setRole] = React.useState<Role | null>(null);
  const [assigned, setAssigned] = React.useState<Template[]>([]);
  const [candidates, setCandidates] = React.useState<Option[]>([]);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!roleId) return;
    setLoading(true);
    try {
      const [row, current, all] = await Promise.all([
        getResource<Role>(`/api/tbac/roles/${roleId}`),
        getResource<{ data: Template[] }>(`/api/tbac/roles/${roleId}/templates`),
        listAll<Template>("/api/tbac/templates", scope.companyId ? { companyId: scope.companyId } : {}),
      ]);
      setRole(row);
      setAssigned(current.data);

      const taken = new Set(current.data.map((tpl) => tpl.id));
      setCandidates(
        all
          .filter((tpl) => tpl.active && !taken.has(tpl.id))
          .map((tpl) => ({ value: tpl.id, label: tpl.name })),
      );
    } catch (error) {
      showError(error);
    } finally {
      setLoading(false);
    }
  }, [roleId, scope.companyId, showError]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function handleAdd() {
    if (!roleId || selected.length === 0) {
      toast.error(t("errors.selectTemplates"));
      return;
    }
    setBusy(true);
    try {
      await createResource(`/api/tbac/roles/${roleId}/templates`, { templateIds: selected });
      toast.success(t("roleTemplates.assigned"));
      setSelected([]);
      await Promise.all([load(), refetchPermissions()]);
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(templateId: string) {
    if (!roleId) return;
    try {
      await deactivateResource<void>(`/api/tbac/roles/${roleId}/templates/${templateId}`);
      toast.success(t("roleTemplates.removed"));
      await Promise.all([load(), refetchPermissions()]);
    } catch (error) {
      showError(error);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <MasterPageHeader
        title={role?.name ?? t("roleTemplates.title")}
        description={role?.description ?? undefined}
      />

      <div className="divide-y divide-border rounded-lg border border-border">
        <SectionCard
          title={
            <span className="text-[12.5px] font-semibold tracking-tight">
              {t("roleTemplates.title")}
            </span>
          }
          border={false}
          padded={false}
          headerClassName="px-5 py-3"
          contentClassName="px-5 pb-4"
        >
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-64 flex-1">
              <MultiValueCombobox
                options={candidates}
                value={selected}
                placeholder={t("roleTemplates.select")}
                onChange={setSelected}
              />
            </div>
            <PermissionButton
              permission="tbac.role_template.assignment"
              onClick={() => void handleAdd()}
              disabled={selected.length === 0 || busy}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t("action.add", { ns: "common" })}
            </PermissionButton>
          </div>
        </SectionCard>

        <SectionCard
          title={
            <span className="text-[12.5px] font-semibold tracking-tight">
              {t("roleTemplates.heading")}
            </span>
          }
          actions={<Badge variant="secondary">{assigned.length}</Badge>}
          border={false}
          padded={false}
          headerClassName="px-5 py-3"
          contentClassName="px-5 pb-4"
        >
          <AssignedTemplateList
            templates={assigned}
            onRemove={handleRemove}
            removePermission="tbac.role_template.assignment"
            emptyMessage={t("roleTemplates.empty")}
          />
        </SectionCard>
      </div>
    </div>
  );
}
