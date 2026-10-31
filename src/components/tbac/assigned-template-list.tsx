import * as React from "react";
import { Layers, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Template } from "@/types/tbac";

import type { PermissionKey } from "@/lib/permissions";
import { PermissionGate } from "@/components/access-control/permission-gate";
import { IconButton } from "@/components/icon-button";
import { SystemBadge } from "@/components/masters/master-page";
import { Button } from "@/components/ui/button";
import { EffectiveFeaturesDialog } from "@/components/tbac/effective-features-dialog";
import { useApiErrorToast } from "@/hooks/use-api-error-toast";
import { getResource } from "@/lib/masters-api";
import type { EffectiveFeatureEntry } from "@/components/tbac/effective-features-dialog";

/**
 * The read side of every assignment screen — what a user, role or template currently holds.
 *
 * "View features" is not decoration. A template's NAME says nothing about what it grants, so
 * without a way to look inside, assigning one is guesswork; v4 puts the same link on all
 * three of its assignment screens. The features are fetched on demand rather than with the
 * list, since most rows are never opened.
 */
export function AssignedTemplateList({
  templates,
  onRemove,
  removePermission,
  emptyMessage,
}: {
  templates: Template[];
  onRemove?: (templateId: string) => void | Promise<void>;
  removePermission?: PermissionKey;
  emptyMessage: string;
}) {
  const { t } = useTranslation(["tbac", "common"]);
  const showError = useApiErrorToast();
  const [viewing, setViewing] = React.useState<Template | null>(null);
  const [features, setFeatures] = React.useState<{
    direct: EffectiveFeatureEntry[];
    inherited: EffectiveFeatureEntry[];
  }>({ direct: [], inherited: [] });

  async function openFeatures(template: Template) {
    setViewing(template);
    setFeatures({ direct: [], inherited: [] });
    try {
      const result = await getResource<{
        direct: EffectiveFeatureEntry[];
        inherited: EffectiveFeatureEntry[];
      }>(`/api/tbac/templates/${template.id}/effective-features`);
      setFeatures(result);
    } catch (error) {
      showError(error);
    }
  }

  if (templates.length === 0) {
    return (
      <div className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      <ul className="divide-y rounded-md border">
        {templates.map((template) => (
          <li key={template.id} className="flex items-center gap-3 px-3 py-2.5">
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="truncate text-sm font-medium">{template.name}</span>
                {template.isSystem && <SystemBadge />}
              </span>
              <span className="block truncate font-mono text-xs text-muted-foreground">
                {template.templateKey}
              </span>
            </span>
            <Button variant="ghost" size="sm" onClick={() => void openFeatures(template)}>
              <Layers className="mr-1.5 h-3.5 w-3.5" />
              {t("templateMaster.fields.features")}
            </Button>
            {onRemove && (
              <PermissionGate permission={removePermission}>
                <IconButton
                  icon={Trash2}
                  label={t("action.remove", { ns: "common" })}
                  onClick={() => void onRemove(template.id)}
                />
              </PermissionGate>
            )}
          </li>
        ))}
      </ul>

      <EffectiveFeaturesDialog
        open={viewing !== null}
        onOpenChange={(open) => !open && setViewing(null)}
        title={viewing?.name ?? ""}
        direct={features.direct}
        inherited={features.inherited}
      />
    </>
  );
}
