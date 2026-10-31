import * as React from "react";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface EffectiveFeatureEntry {
  key: string;
  moduleName: string;
  actionName?: string;
}

interface ModuleGroup {
  moduleName: string;
  direct: EffectiveFeatureEntry[];
  inherited: EffectiveFeatureEntry[];
}

/**
 * One collapsed row per module, each carrying its own direct/inherited counts.
 *
 * Grouping by MODULE rather than by direct-vs-inherited is v4's choice and the right one:
 * the question an admin actually has is "what can this template do to Users?", and a
 * top-level split by provenance forces them to read the same module twice to answer it.
 */
function groupByModule(
  direct: EffectiveFeatureEntry[],
  inherited: EffectiveFeatureEntry[],
): ModuleGroup[] {
  const groups = new Map<string, ModuleGroup>();
  const bucket = (moduleName: string) => {
    const existing = groups.get(moduleName);
    if (existing) return existing;
    const created: ModuleGroup = { moduleName, direct: [], inherited: [] };
    groups.set(moduleName, created);
    return created;
  };
  for (const entry of direct) bucket(entry.moduleName).direct.push(entry);
  for (const entry of inherited) bucket(entry.moduleName).inherited.push(entry);
  const byKey = (a: EffectiveFeatureEntry, b: EffectiveFeatureEntry) => a.key.localeCompare(b.key);
  return [...groups.values()]
    .map((group) => ({
      ...group,
      direct: [...group.direct].sort(byKey),
      inherited: [...group.inherited].sort(byKey),
    }))
    .sort((a, b) => a.moduleName.localeCompare(b.moduleName));
}

function FeatureRow({ entry, inherited }: { entry: EffectiveFeatureEntry; inherited?: boolean }) {
  const { t } = useTranslation("tbac");
  return (
    <div
      className={cn(
        "border-l-2 py-1.5 pl-3",
        inherited ? "border-l-muted-foreground/40" : "border-l-primary",
      )}
    >
      <p className="font-mono text-xs">{entry.key}</p>
      {entry.actionName && (
        <p className="text-xs text-muted-foreground">
          {t("effectiveFeatures.action", { action: entry.actionName })}
        </p>
      )}
    </div>
  );
}

/**
 * Everything a template grants, broken down by module and by provenance.
 *
 * Fed by `GET /api/tbac/templates/:id/effective-features`, which does the direct/inherited
 * split server-side — it is a graph walk, not something the client can compute from a flat
 * list. Also reused from the Role master, where every grant arrives through a template and
 * so everything lands in `direct`.
 */
export function EffectiveFeaturesDialog({
  open,
  onOpenChange,
  title,
  direct,
  inherited,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  direct: EffectiveFeatureEntry[];
  inherited: EffectiveFeatureEntry[];
}) {
  const { t } = useTranslation("tbac");
  const groups = React.useMemo(() => groupByModule(direct, inherited), [direct, inherited]);
  const total = direct.length + inherited.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{t("effectiveFeatures.subtitle")}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{t("effectiveFeatures.title")}</p>
          <Badge variant="outline">{t("effectiveFeatures.total", { count: total })}</Badge>
        </div>

        {total === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t("effectiveFeatures.empty")}
          </p>
        ) : (
          <div className="space-y-2">
            {groups.map((group) => (
              <Collapsible key={group.moduleName} className="rounded-lg border">
                <CollapsibleTrigger className="group flex w-full items-center gap-2 px-3 py-2 text-left">
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=closed]:-rotate-90" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {group.moduleName}
                  </span>
                  {group.direct.length > 0 && (
                    <Badge variant="default">
                      {t("effectiveFeatures.directBadge", { count: group.direct.length })}
                    </Badge>
                  )}
                  {group.inherited.length > 0 && (
                    <Badge variant="secondary">
                      {t("effectiveFeatures.inheritedBadge", { count: group.inherited.length })}
                    </Badge>
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-1 border-t px-3 py-2">
                    {group.direct.map((entry) => (
                      <FeatureRow key={entry.key} entry={entry} />
                    ))}
                    {group.inherited.map((entry) => (
                      <FeatureRow key={entry.key} entry={entry} inherited />
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
