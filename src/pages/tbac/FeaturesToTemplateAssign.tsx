import * as React from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { EffectiveFeatures, Feature, Template } from "@/types/tbac";

import { SectionCard } from "@/components/section-card";
import { Skeleton } from "@/components/ui/skeleton";
import { MasterPageHeader } from "@/components/masters/master-page";
import { TransferList, type TransferItem } from "@/components/tbac/transfer-list";
import { useCompanyScope } from "@/components/masters/company-scope-select";
import { usePermissions } from "@/hooks/use-permission";
import { useApiErrorToast } from "@/hooks/use-api-error-toast";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import {
  MAX_PAGE_SIZE,
  createResource,
  deactivateResource,
  getResource,
  listResource,
} from "@/lib/masters-api";

const TEMPLATES = "/api/tbac/templates";

/**
 * Assign features to one template — v4's `/tbac/features-to-template/[templateId]`.
 *
 * The available side is SERVER-paged and server-searched: a tenant registers a few hundred
 * features, and loading them all to filter in the browser is the thing `usePaginatedList`
 * exists to avoid. The assigned side is small enough to hold whole, which is also what lets
 * the direct/inherited split be computed once and searched client-side.
 */
export default function FeaturesToTemplateAssignPage() {
  const { t } = useTranslation(["tbac", "common"]);
  const { templateId } = useParams<{ templateId: string }>();
  const showError = useApiErrorToast();
  const { refetchPermissions } = usePermissions();
  const scope = useCompanyScope();

  const [template, setTemplate] = React.useState<Template | null>(null);
  const [effective, setEffective] = React.useState<EffectiveFeatures>({
    direct: [],
    inherited: [],
  });
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const load = React.useCallback(async () => {
    if (!templateId) return;
    setLoading(true);
    try {
      const [row, features] = await Promise.all([
        getResource<Template>(`${TEMPLATES}/${templateId}`),
        getResource<EffectiveFeatures>(`${TEMPLATES}/${templateId}/effective-features`),
      ]);
      setTemplate(row);
      setEffective(features);
    } catch (error) {
      showError(error);
    } finally {
      setLoading(false);
    }
  }, [templateId, showError]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const available = usePaginatedList<Feature>({
    queryKey: ["tbac", "features", "assignable", templateId ?? "", scope.companyId ?? ""],
    search,
    fetchPage: ({ page, pageSize, search: term }) =>
      listResource<Feature>("/api/tbac/features", page, pageSize, {
        search: term || undefined,
        companyId: template?.companyId ?? scope.companyId ?? undefined,
      }),
    pageSize: MAX_PAGE_SIZE,
    getItemKey: (item) => item.id,
  });

  // Everything already reachable — direct OR inherited. Filtering inherited out of the
  // available side matters: offering to "add" something the template already gets through a
  // reference would produce a duplicate grant that the UI then shows twice.
  const assignedIds = React.useMemo(
    () => new Set([...effective.direct, ...effective.inherited].map((f) => f.id)),
    [effective],
  );

  const toItem = React.useCallback(
    (feature: {
      id: string;
      key: string;
      moduleName: string;
      actionName?: string;
    }): TransferItem => ({
      id: feature.id,
      label: feature.key,
      hint: [feature.moduleName, feature.actionName]
        .filter(Boolean)
        .join(" · "),
    }),
    [t],
  );

  const availableItems = React.useMemo(
    () => available.items.filter((f) => !assignedIds.has(f.id)).map(toItem),
    [available.items, assignedIds, toItem],
  );

  async function handleAdd(ids: string[]) {
    if (!templateId || ids.length === 0) return;
    setBusy(true);
    try {
      await createResource(`${TEMPLATES}/${templateId}/features`, { featureIds: ids });
      toast.success(t("transfer.featuresAdded"));
      await Promise.all([load(), refetchPermissions()]);
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(ids: string[]) {
    if (!templateId || ids.length === 0) return;
    setBusy(true);
    try {
      // One DELETE per feature, matching v4 — the API has no bulk-detach, and a replace-all
      // PUT here would clobber anything added in another tab meanwhile. They are independent
      // and idempotent, so they go out together rather than one round trip at a time.
      await Promise.all(
        ids.map((id) => deactivateResource<void>(`${TEMPLATES}/${templateId}/features/${id}`)),
      );
      toast.success(t("transfer.featuresRemoved"));
      await Promise.all([load(), refetchPermissions()]);
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <MasterPageHeader
        title={template?.name ?? t("featuresToTemplate.title")}
        description={template?.description ?? undefined}
      />

      <SectionCard className="mb-3" padded>
        <dl className="grid gap-x-6 gap-y-1 text-[12.5px] sm:grid-cols-2">
          <div className="flex gap-2">
            <dt className="text-[11px] text-muted-foreground">
              {t("templateMaster.fields.templateKey")}
            </dt>
            <dd className="font-mono text-[11px] leading-5">{template?.templateKey}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-[11px] text-muted-foreground">
              {t("templateMaster.fields.features")}
            </dt>
            <dd>{effective.direct.length + effective.inherited.length}</dd>
          </div>
        </dl>
      </SectionCard>

      <TransferList
        available={availableItems}
        direct={effective.direct.map(toItem)}
        inherited={effective.inherited.map(toItem)}
        onAdd={handleAdd}
        onRemove={handleRemove}
        permission="tbac.features_to_template.assignment"
        availableSearch={search}
        onAvailableSearchChange={setSearch}
        availableTotal={
          available.total === null ? null : Math.max(0, available.total - assignedIds.size)
        }
        isLoading={available.isLoading}
        isLoadingMore={available.isLoadingMore}
        onAvailableScroll={available.onScroll}
        sentinelRef={available.sentinelRef}
        busy={busy}
      />
    </div>
  );
}
