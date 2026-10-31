import * as React from "react";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { catalogueByModule } from "@/lib/tbac-modules";
import { useFeatureCatalogue } from "@/hooks/use-feature-catalogue";

import { AppDialog } from "@/components/app-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useApiErrorToast } from "@/hooks/use-api-error-toast";
import { createResource } from "@/lib/masters-api";

/**
 * Bulk Register — how a tenant actually populates its Feature Master.
 *
 * The list comes from the server's catalogue of permission keys -- the ones the code enforces. So this is not "create
 * arbitrary features": it is "register the ones this build knows how to enforce". A key the
 * code has never heard of would parse fine and gate nothing.
 *
 * Registration is idempotent server-side, so submitting twice is safe and, importantly,
 * never reactivates something an admin deliberately switched off.
 */
export function BulkFeatureRegisterDialog({
  open,
  onOpenChange,
  onRegistered,
  companyId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegistered: () => void;
  /** Super admins must target a tenant; `tenantScope` pins everyone else to their own. */
  companyId?: string | null;
}) {
  const { t } = useTranslation(["tbac", "common"]);
  const showError = useApiErrorToast();
  const { data: catalogue = [] } = useFeatureCatalogue();
  const modules = React.useMemo(() => catalogueByModule(catalogue), [catalogue]);

  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = React.useState(false);

  // Reopening starts clean — carrying a previous selection over is a way to register
  // something by accident.
  React.useEffect(() => {
    if (open) {
      setSelected(new Set());
    }
  }, [open]);

  function toggleKey(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleModule(keys: string[]) {
    setSelected((prev) => {
      const next = new Set(prev);
      const all = keys.every((key) => next.has(key));
      for (const key of keys) {
        if (all) next.delete(key);
        else next.add(key);
      }
      return next;
    });
  }

  async function handleSubmit() {
    if (selected.size === 0) {
      toast.error(t("bulkRegister.nothingSelected"));
      return;
    }
    setSubmitting(true);
    try {
      const features = catalogue.filter((entry) => selected.has(entry.key)).map((entry) => ({ key: entry.key }));
      const query = companyId ? `?companyId=${companyId}` : "";
      const result = await createResource<{ registered: number; skipped: number }>(
        `/api/tbac/features/bulk-register${query}`,
        { features },
      );
      toast.success(t("bulkRegister.result", result));
      onRegistered();
      onOpenChange(false);
    } catch (error) {
      showError(error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      scrollBody
      title={t("bulkRegister.title")}
      description={t("bulkRegister.subtitle")}
      confirmLabel={submitting ? t("bulkRegister.submitting") : t("bulkRegister.submit")}
      cancelLabel={t("action.cancel", { ns: "common" })}
      loading={submitting}
      onConfirm={handleSubmit}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setSelected(
                (prev) =>
                  new Set([
                    ...prev,
                    ...modules.flatMap((module) => module.entries.map((entry) => entry.key)),
                  ]),
              )
            }
          >
            {t("bulkRegister.selectAll")}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
            {t("bulkRegister.deselectAll")}
          </Button>
        </div>
        <Badge>{t("bulkRegister.selectedCount", { count: selected.size })}</Badge>
      </div>

      <div className="space-y-2">
        {modules.map((module) => {
          const keys = module.entries.map((entry) => entry.key);
          const all = keys.every((key) => selected.has(key));
          const some = keys.some((key) => selected.has(key));
          return (
            <Collapsible key={module.moduleName} className="rounded-lg border">
              <div className="flex items-center gap-2 px-3 py-2">
                <Checkbox
                  aria-label={module.moduleName}
                  checked={all ? true : some ? "indeterminate" : false}
                  onCheckedChange={() => toggleModule(keys)}
                />
                <CollapsibleTrigger className="group flex min-w-0 flex-1 items-center gap-2 text-left">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {module.moduleName}
                  </span>
                  <Badge variant="outline">
                    {t("bulkRegister.moduleCount", { count: module.entries.length })}
                  </Badge>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=closed]:-rotate-90" />
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent>
                <div className="space-y-1 border-t px-3 py-2 pl-10">
                  {module.entries.map((entry) => (
                    <label key={entry.key} className="flex cursor-pointer items-center gap-2 py-1">
                      <Checkbox
                        checked={selected.has(entry.key)}
                        onCheckedChange={() => toggleKey(entry.key)}
                      />
                      <span className="min-w-0">
                        <span className="block truncate font-mono text-xs">{entry.key}</span>
                        <span className="block text-xs text-muted-foreground">
                          {entry.actionName}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </AppDialog>
  );
}
