import * as React from "react";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { Feature, Template } from "@/types/tbac";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/hooks/use-permission";
import { useApiErrorToast } from "@/hooks/use-api-error-toast";
import { createResource, getResource, listAll } from "@/lib/masters-api";
import { useCompanyScope } from "@/components/masters/company-scope-select";
import { useFeatureCatalogue } from "@/hooks/use-feature-catalogue";
import { matchTemplateNameToModule, moduleKeys } from "@/lib/tbac-modules";
import { cn } from "@/lib/utils";

/**
 * The body revealed when a Features-to-Template row is expanded — v4's `TemplateQuickAddRow`.
 *
 * Not a picker. It matches the template's NAME to a module and offers a single click that
 * adds every one of that module's features not already on the template. Anything finer
 * grained is what the full assignment page is for.
 *
 * `onCountUpdate` fires as soon as it knows the current count, so the parent row's badge is
 * correct WITHOUT collapsing the row the user just opened — v4 added that callback for
 * exactly this reason, and losing it makes the badge lie until the next refetch.
 *
 * Both callbacks are held in a REF rather than read from props inside `load`. An inline
 * arrow in the parent is a new function every render, so depending on it directly makes
 * `load` unstable, which re-fires the effect, which calls `onCountUpdate`, which re-renders
 * the parent — an infinite fetch loop that stops only when the API's rate limiter cuts in.
 * A ref keeps the latest callback without making it a dependency.
 */
export function TemplateQuickAddRow({
  template,
  onFeaturesAssigned,
  onCountUpdate,
}: {
  template: Template;
  onFeaturesAssigned: (templateId: string) => void;
  onCountUpdate?: (templateId: string, count: number) => void;
}) {
  const { t } = useTranslation("tbac");
  const showError = useApiErrorToast();
  const { refetchPermissions } = usePermissions();

  const [loading, setLoading] = React.useState(true);
  const [assigning, setAssigning] = React.useState(false);
  const [available, setAvailable] = React.useState<string[]>([]);
  const [registered, setRegistered] = React.useState(0);

  const scope = useCompanyScope();
  const { data: catalogue = [] } = useFeatureCatalogue();
  const moduleName = React.useMemo(() => matchTemplateNameToModule(template.name, catalogue), [template.name, catalogue]);
  // A system template has no company of its own: platform staff work on the one in their scope.
  const featuresCompanyId = template.companyId ?? scope.companyId ?? undefined;

  const callbacks = React.useRef({ onFeaturesAssigned, onCountUpdate });
  callbacks.current = { onFeaturesAssigned, onCountUpdate };

  const load = React.useCallback(async () => {
    if (!moduleName) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [effective, features] = await Promise.all([
        getResource<{ direct: { id: string }[]; inherited: { id: string }[] }>(
          `/api/tbac/templates/${template.id}/effective-features`,
        ),
        // Filtered server-side to this module — the catalogue runs to hundreds of rows and
        // only a handful belong here, so fetching all of them to discard most is waste.
        listAll<Feature>("/api/tbac/features", {
          companyId: featuresCompanyId,
          filters: [{ field: "moduleName", operator: "equals", value: moduleName }],
        }),
      ]);

      const assigned = new Set([...effective.direct, ...effective.inherited].map((f) => f.id));
      callbacks.current.onCountUpdate?.(template.id, assigned.size);

      const wanted = new Set(moduleKeys(moduleName, catalogue));
      const inModule = features.filter((f) => wanted.has(f.key) && f.active);
      setRegistered(inModule.length);
      setAvailable(inModule.filter((f) => !assigned.has(f.id)).map((f) => f.id));
    } catch (error) {
      showError(error);
    } finally {
      setLoading(false);
    }
  }, [moduleName, template.id, featuresCompanyId, catalogue, showError]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function handleAdd() {
    setAssigning(true);
    try {
      await createResource(`/api/tbac/templates/${template.id}/features`, {
        featureIds: available,
      });
      toast.success(t("quickAdd.added", { count: available.length, module: moduleName }));
      // The actor may have just granted themselves something — refresh so the sidebar agrees.
      await refetchPermissions();
      callbacks.current.onFeaturesAssigned(template.id);
    } catch (error) {
      showError(error);
    } finally {
      setAssigning(false);
    }
  }

  const message = (text: string) => (
    <div className="bg-muted/30 px-4 py-3 text-sm text-muted-foreground">{text}</div>
  );

  if (!moduleName) return message(t("quickAdd.notAvailable"));
  if (loading) {
    return (
      <div className="bg-muted/30 px-4 py-3">
        <Skeleton className="h-8 w-72" />
      </div>
    );
  }
  if (registered === 0) return message(t("quickAdd.noneRegistered", { module: moduleName }));
  if (available.length === 0) return message(t("quickAdd.allAssigned", { module: moduleName }));

  return (
    <div className="flex items-center gap-3 bg-muted/30 px-4 py-3">
      <button
        type="button"
        disabled={assigning}
        onClick={() => void handleAdd()}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-background px-3 py-1",
          "text-sm text-primary transition-colors hover:bg-primary/10 disabled:opacity-60",
        )}
      >
        <Plus className="h-3.5 w-3.5" />
        {t("quickAdd.add", { count: available.length, module: moduleName })}
      </button>
      <Badge variant="outline">
        {t("featuresToTemplate.assignedCount", { count: registered })}
      </Badge>
    </div>
  );
}
