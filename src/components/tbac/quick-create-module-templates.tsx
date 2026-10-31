import * as React from "react";
import { ChevronDown, Plus, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { Feature } from "@/types/tbac";

import { AppDialog } from "@/components/app-dialog";
import { PermissionButton } from "@/components/access-control/permission-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useApiErrorToast } from "@/hooks/use-api-error-toast";
import { createResource, listAll } from "@/lib/masters-api";
import { useFeatureCatalogue } from "@/hooks/use-feature-catalogue";
import { allModuleNames, moduleKeys } from "@/lib/tbac-modules";
import { cn } from "@/lib/utils";

interface CreateOutcome {
  moduleName: string;
  featureCount?: number;
  error?: string;
}

/**
 * Quick Create — one ready-made template per module, features already attached.
 *
 * This is the shortest path from a fresh install to a usable permission matrix, and it is
 * why v4 put it directly above the Template Master table rather than behind a menu. Without
 * it, standing up a tenant means creating ~10 templates by hand and picking their features
 * one at a time.
 *
 * "Create all" runs SEQUENTIALLY, not in parallel: each create is followed by a feature
 * assignment on the row it just made, and a name collision on one module must not abort the
 * rest. Failures are collected per module and shown together at the end.
 */
export function QuickCreateModuleTemplates({
  existingNames,
  companyId,
  onCreated,
}: {
  /** Template names already in this tenant — a module with one is not offered again. */
  existingNames: string[];
  companyId?: string | null;
  onCreated: () => void;
}) {
  const { t } = useTranslation(["tbac", "common"]);
  const showError = useApiErrorToast();
  const { data: catalogue = [] } = useFeatureCatalogue();

  const [busyModule, setBusyModule] = React.useState<string | null>(null);
  const [creatingAll, setCreatingAll] = React.useState(false);
  const [results, setResults] = React.useState<CreateOutcome[] | null>(null);

  const availableModules = React.useMemo(() => {
    const taken = new Set(existingNames.map((name) => name.trim().toLowerCase()));
    return allModuleNames(catalogue).filter((moduleName) => !taken.has(moduleName.toLowerCase()));
  }, [existingNames, catalogue]);

  /** Create the template, then attach every registered feature of that module. */
  async function createForModule(moduleName: string, features: Feature[]): Promise<CreateOutcome> {
    const query = companyId ? `?companyId=${companyId}` : "";
    const template = await createResource<{ id: string }>(`/api/tbac/templates${query}`, {
      name: moduleName,
      description: `Every ${moduleName} permission.`,
      active: true,
    });

    const wanted = new Set(moduleKeys(moduleName, catalogue));
    const featureIds = features.filter((f) => wanted.has(f.key) && f.active).map((f) => f.id);
    if (featureIds.length > 0) {
      await createResource(`/api/tbac/templates/${template.id}/features`, { featureIds });
    }
    return { moduleName, featureCount: featureIds.length };
  }

  /**
   * The tenant's registered features, fetched ONCE per run.
   *
   * Per-module fetching would mean ~10 identical round trips for "create all", and the
   * catalogue is small enough to hold in memory for the duration.
   */
  async function loadFeatures(): Promise<Feature[]> {
    return listAll<Feature>("/api/tbac/features", companyId ? { companyId } : {});
  }

  async function handleOne(moduleName: string) {
    setBusyModule(moduleName);
    try {
      const features = await loadFeatures();
      const outcome = await createForModule(moduleName, features);
      toast.success(
        t("quickCreate.oneCreated", { module: moduleName, count: outcome.featureCount ?? 0 }),
      );
      onCreated();
    } catch (error) {
      showError(error);
    } finally {
      setBusyModule(null);
    }
  }

  async function handleAll() {
    setCreatingAll(true);
    const outcomes: CreateOutcome[] = [];
    try {
      const features = await loadFeatures();
      for (const moduleName of availableModules) {
        try {
          outcomes.push(await createForModule(moduleName, features));
        } catch (error) {
          outcomes.push({
            moduleName,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
      setResults(outcomes);
      onCreated();
    } catch (error) {
      showError(error);
    } finally {
      setCreatingAll(false);
    }
  }

  const succeeded = results?.filter((r) => !r.error) ?? [];
  const failed = results?.filter((r) => r.error) ?? [];

  return (
    <>
      <Card className="mb-4">
        <Collapsible defaultOpen={availableModules.length > 0}>
          <CardContent className="p-0">
            <div className="flex items-center gap-2 px-4 py-3">
              <CollapsibleTrigger className="group flex min-w-0 flex-1 items-center gap-2 text-left">
                <Sparkles className="h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {t("quickCreate.title")}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {t("quickCreate.subtitle")}
                  </span>
                </span>
                <Badge variant="outline">
                  {t("quickCreate.available", { count: availableModules.length })}
                </Badge>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=closed]:-rotate-90" />
              </CollapsibleTrigger>
              {availableModules.length > 0 && (
                <PermissionButton
                  permission="tbac.template_master.add"
                  size="sm"
                  onClick={() => void handleAll()}
                  disabled={creatingAll || busyModule !== null}
                >
                  {creatingAll ? t("quickCreate.creating") : t("quickCreate.createAll")}
                </PermissionButton>
              )}
            </div>

            <CollapsibleContent>
              <div className="border-t px-4 py-3">
                {availableModules.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("quickCreate.none")}</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {availableModules.map((moduleName) => (
                      <button
                        key={moduleName}
                        type="button"
                        disabled={creatingAll || busyModule !== null}
                        onClick={() => void handleOne(moduleName)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-background",
                          "px-3 py-1 text-sm text-primary transition-colors hover:bg-primary/10",
                          "disabled:opacity-60",
                          busyModule === moduleName && "animate-pulse",
                        )}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        {moduleName}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </CardContent>
        </Collapsible>
      </Card>

      <AppDialog
        open={results !== null}
        onOpenChange={(open) => !open && setResults(null)}
        title={t("quickCreate.resultTitle")}
        size="md"
        scrollBody
        confirmLabel={t("action.close", { ns: "common" })}
        onConfirm={() => setResults(null)}
      >
        {succeeded.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("quickCreate.successHeading", { count: succeeded.length })}
            </p>
            <ul className="space-y-1 text-sm">
              {succeeded.map((r) => (
                <li key={r.moduleName}>
                  {t("quickCreate.created", { module: r.moduleName, count: r.featureCount ?? 0 })}
                </li>
              ))}
            </ul>
          </div>
        )}
        {failed.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-destructive">
              {t("quickCreate.failureHeading", { count: failed.length })}
            </p>
            <ul className="space-y-1 text-sm">
              {failed.map((r) => (
                <li key={r.moduleName} className="text-muted-foreground">
                  {t("quickCreate.failed", { module: r.moduleName, error: r.error })}
                </li>
              ))}
            </ul>
          </div>
        )}
      </AppDialog>
    </>
  );
}
