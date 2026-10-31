import * as React from "react";
import { Plus } from "lucide-react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { formatPhoneForDisplay } from "@/lib/format";
import type { PublicUser, Template } from "@/types/tbac";

import { PermissionButton } from "@/components/access-control/permission-button";
import { SectionCard } from "@/components/section-card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MasterPageHeader } from "@/components/masters/master-page";
import { MultiValueCombobox, type Option } from "@/components/masters/value-combobox";
import { AssignedTemplateList } from "@/components/tbac/assigned-template-list";
import { usePermissions } from "@/hooks/use-permission";
import { useApiErrorToast } from "@/hooks/use-api-error-toast";
import { createResource, deactivateResource, getResource, listAll } from "@/lib/masters-api";

/**
 * One user's directly-assigned templates (UBAC) — v4's `/tbac/assignments/users/[userId]`.
 *
 * These are ON TOP of whatever their roles grant, and independent of them: removing the
 * user's role does not remove these. That is the point of the UBAC half — a one-off grant
 * that does not require inventing a role for one person.
 */
export default function UserTemplateAssignPage() {
  const { t } = useTranslation(["tbac", "common", "masters"]);
  const { userId } = useParams<{ userId: string }>();
  const showError = useApiErrorToast();
  const { refetchPermissions } = usePermissions();

  const [user, setUser] = React.useState<PublicUser | null>(null);
  const [assigned, setAssigned] = React.useState<Template[]>([]);
  const [candidates, setCandidates] = React.useState<Option[]>([]);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [profile, current, all] = await Promise.all([
        getResource<PublicUser>(`/api/tbac/users/${userId}`),
        getResource<{ data: Template[] }>(`/api/tbac/users/${userId}/templates`),
        listAll<Template>("/api/tbac/templates"),
      ]);
      setUser(profile);
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
  }, [userId, showError]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function handleAdd() {
    if (!userId || selected.length === 0) {
      toast.error(t("errors.selectTemplates"));
      return;
    }
    setBusy(true);
    try {
      await createResource(`/api/tbac/users/${userId}/templates`, { templateIds: selected });
      toast.success(t("userTemplates.assigned"));
      setSelected([]);
      await Promise.all([load(), refetchPermissions()]);
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(templateId: string) {
    if (!userId) return;
    try {
      await deactivateResource<void>(`/api/tbac/users/${userId}/templates/${templateId}`);
      toast.success(t("userTemplates.removed"));
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
      <MasterPageHeader title={user?.name ?? t("userTemplates.title")} description={user?.email} />

      <SectionCard className="mb-3" padded>
        <dl className="grid gap-x-6 gap-y-1 text-[12.5px] sm:grid-cols-3">
          <div className="flex gap-2">
            <dt className="text-[11px] text-muted-foreground">
              {t("user.fields.email", { ns: "masters" })}
            </dt>
            <dd>{user?.email}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-[11px] text-muted-foreground">
              {t("user.fields.mobile", { ns: "masters" })}
            </dt>
            <dd>{formatPhoneForDisplay(user?.mobile) ?? "-"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-[11px] text-muted-foreground">
              {t("user.fields.orgUnit", { ns: "masters" })}
            </dt>
            <dd>{user?.orgUnitName ?? "-"}</dd>
          </div>
        </dl>
      </SectionCard>

      <div className="divide-y divide-border rounded-lg border border-border">
        <SectionCard
          title={
            <span className="text-[12.5px] font-semibold tracking-tight">
              {t("userTemplates.title")}
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
                placeholder={t("userTemplates.select")}
                onChange={setSelected}
              />
            </div>
            <PermissionButton
              permission="tbac.user_template.assignment"
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
              {t("userTemplates.heading")}
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
            removePermission="tbac.user_template.assignment"
            emptyMessage={t("userTemplates.empty")}
          />
        </SectionCard>
      </div>
    </div>
  );
}
