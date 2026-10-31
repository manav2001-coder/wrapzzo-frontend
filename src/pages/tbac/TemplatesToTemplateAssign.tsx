import * as React from "react";
import { Plus } from "lucide-react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { AddTemplateReferencesResult, Template } from "@/types/tbac";

import { PermissionButton } from "@/components/access-control/permission-button";
import { SectionCard } from "@/components/section-card";
import { Skeleton } from "@/components/ui/skeleton";
import { MasterPageHeader } from "@/components/masters/master-page";
import { MultiValueCombobox, type Option } from "@/components/masters/value-combobox";
import { AssignedTemplateList } from "@/components/tbac/assigned-template-list";
import { usePermissions } from "@/hooks/use-permission";
import { useApiErrorToast } from "@/hooks/use-api-error-toast";
import { createResource, deactivateResource, getResource, listAll } from "@/lib/masters-api";

const PATH = "/api/tbac/templates";

/**
 * Compose one template out of others — v4's `/tbac/templates-to-template/[templateId]`.
 *
 * Deliberately NOT a transfer list, unlike the feature screen. A reference can be REJECTED
 * (it would close a cycle, or push the chain past the depth cap), and the API answers with a
 * per-candidate summary — which needs a place to show "3 of 4 added, and here is why the
 * fourth was not". A transfer list's silent left-to-right animation has nowhere to put that.
 */
export default function TemplatesToTemplateAssignPage() {
  const { t } = useTranslation(["tbac", "common"]);
  const { templateId } = useParams<{ templateId: string }>();
  const showError = useApiErrorToast();
  const { refetchPermissions } = usePermissions();

  const [template, setTemplate] = React.useState<Template | null>(null);
  const [referenced, setReferenced] = React.useState<Template[]>([]);
  const [candidates, setCandidates] = React.useState<Option[]>([]);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!templateId) return;
    setLoading(true);
    try {
      const [row, refIds, all] = await Promise.all([
        getResource<Template>(`${PATH}/${templateId}`),
        getResource<{ data: string[] }>(`${PATH}/${templateId}/references`),
        listAll<Template>(PATH),
      ]);
      setTemplate(row);

      const byId = new Map(all.map((tpl) => [tpl.id, tpl]));
      const current = refIds.data.map((id) => byId.get(id)).filter((tpl): tpl is Template => !!tpl);
      setReferenced(current);

      // Exclude itself and anything already included — both would be rejected server-side,
      // so offering them would only produce an error the user could not have avoided.
      const taken = new Set([templateId, ...refIds.data]);
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
  }, [templateId, showError]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function handleAdd() {
    if (!templateId || selected.length === 0) {
      toast.error(t("errors.selectTemplates"));
      return;
    }
    setBusy(true);
    try {
      const result = await createResource<AddTemplateReferencesResult>(
        `${PATH}/${templateId}/references`,
        { referencedTemplateIds: selected },
      );

      if (result.added > 0) {
        toast.success(
          result.errors.length > 0
            ? t("templatesToTemplate.partial", {
                added: result.added,
                total: result.totalRequested,
              })
            : t("templatesToTemplate.added"),
        );
      }
      // Each rejection gets its own toast — they are different reasons, and collapsing them
      // into "some failed" hides the one thing the user needs in order to fix it.
      for (const message of result.errors) toast.error(message);

      setSelected([]);
      await Promise.all([load(), refetchPermissions()]);
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(referencedId: string) {
    if (!templateId) return;
    try {
      await deactivateResource<void>(`${PATH}/${templateId}/references/${referencedId}`);
      toast.success(t("templatesToTemplate.removed"));
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
        title={template?.name ?? t("templatesToTemplate.title")}
        description={template?.templateKey}
      />

      <div className="divide-y divide-border rounded-lg border border-border">
        <SectionCard
          title={
            <span className="text-[12.5px] font-semibold tracking-tight">
              {t("templatesToTemplate.add")}
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
                placeholder={t("templatesToTemplate.select")}
                onChange={setSelected}
              />
            </div>
            <PermissionButton
              permission="tbac.templates_to_template.assignment"
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
              {t("templatesToTemplate.heading")}
            </span>
          }
          border={false}
          padded={false}
          headerClassName="px-5 py-3"
          contentClassName="px-5 pb-4"
        >
          <AssignedTemplateList
            templates={referenced}
            onRemove={handleRemove}
            removePermission="tbac.templates_to_template.assignment"
            emptyMessage={t("templatesToTemplate.empty")}
          />
        </SectionCard>
      </div>
    </div>
  );
}
