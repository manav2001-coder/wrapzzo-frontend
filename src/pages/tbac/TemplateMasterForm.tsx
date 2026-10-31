import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";
import type { Template } from "@/types/tbac";

import { FormGenerator, type FieldConfig } from "@/components/fields/form-generator";
import { SwitchField } from "@/components/fields/switch-field";
import { TextField } from "@/components/fields/text-field";
import { MasterPageHeader } from "@/components/masters/master-page";
import { useCompanyScope } from "@/components/masters/company-scope-select";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiErrorToast } from "@/hooks/use-api-error-toast";
import { useUserTimezone } from "@/hooks/use-user-timezone";
import { formatDateTime } from "@/lib/datetime";
import { createResource, getResource, setResource } from "@/lib/masters-api";

const PATH = "/api/tbac/templates";

export type TemplateFormMode = "create" | "edit" | "view";

/**
 * Create / edit / view a template — v4's `TemplateMasterForm`, one component switched by
 * `mode`, on its own route rather than in a drawer (v4 routes it too, and a full page is
 * the right shape once the read-only audit block is on it).
 *
 * `templateKey` and the audit fields render only outside `create`, and always disabled: the
 * key is derived server-side from the name and deliberately never re-derived on rename, so
 * showing it as editable would promise something the API will not do.
 */
export default function TemplateMasterFormPage({ mode }: { mode: TemplateFormMode }) {
  const { t } = useTranslation(["tbac", "common"]);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const showError = useApiErrorToast();
  const timeZone = useUserTimezone();
  // A template is owned by a franchise; a super admin picks which one before creating.
  const scope = useCompanyScope();

  const [template, setTemplate] = React.useState<Template | null>(null);
  const [loading, setLoading] = React.useState(mode !== "create");

  React.useEffect(() => {
    if (mode === "create" || !id) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const row = await getResource<Template>(`${PATH}/${id}`);
        if (!cancelled) setTemplate(row);
      } catch (error) {
        showError(error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, mode, showError]);

  const readOnly = mode === "view";

  const fields: FieldConfig[] = React.useMemo(() => {
    const text = (
      fieldId: string,
      label: string,
      opts: { required?: boolean; max?: number; description?: string; disabled?: boolean } = {},
    ): FieldConfig => ({
      id: fieldId,
      label,
      description: opts.description,
      required: opts.required,
      spanToFullRow: true,
      zodSchema: opts.required
        ? z
            .string()
            .trim()
            .min(1)
            .max(opts.max ?? 255)
        : z
            .string()
            .trim()
            .max(opts.max ?? 255)
            .optional(),
      render: ({ value, onChange, disabled }) => (
        <TextField
          value={(value as string) ?? ""}
          disabled={disabled || readOnly || opts.disabled}
          onChange={(event) => onChange(event.target.value)}
        />
      ),
    });

    const base: FieldConfig[] = [
      text("name", t("templateMaster.fields.name"), { required: true, max: 100 }),
      text("description", t("templateMaster.fields.description"), { max: 500 }),
      text("icon", t("templateMaster.fields.icon"), { max: 50 }),
      text("path", t("templateMaster.fields.path"), { max: 255 }),
      {
        id: "active",
        label: t("templateMaster.fields.active"),
        fieldKind: "boolean",
        initialValue: true,
        spanToFullRow: true,
        zodSchema: z.boolean(),
        render: ({ value, onChange, disabled }) => (
          <SwitchField
            checked={Boolean(value)}
            disabled={disabled || readOnly}
            onCheckedChange={(checked) => onChange(checked)}
          />
        ),
      },
    ];

    if (mode === "create") return base;

    // Server-derived. Present for reference, never editable — see the note above.
    const readOnlyText = (fieldId: string, label: string, value: string): FieldConfig => ({
      id: fieldId,
      label,
      spanToFullRow: true,
      render: () => <TextField value={value} disabled />,
    });

    return [
      ...base,
      {
        ...readOnlyText(
          "templateKey",
          t("templateMaster.fields.templateKey"),
          template?.templateKey ?? "",
        ),
        description: t("templateMaster.fields.templateKeyHelp"),
      },
      readOnlyText("addedByName", t("templateMaster.fields.addedBy"), template?.addedByName ?? "-"),
      readOnlyText(
        "addedOn",
        t("templateMaster.fields.addedOn"),
        formatDateTime(template?.addedOn ?? null, { timeZone }),
      ),
      readOnlyText(
        "updatedByName",
        t("templateMaster.fields.updatedBy"),
        template?.updatedByName ?? "-",
      ),
      readOnlyText(
        "updatedOn",
        t("templateMaster.fields.updatedOn"),
        formatDateTime(template?.updatedOn ?? null, { timeZone }),
      ),
    ];
  }, [t, mode, readOnly, template, timeZone]);

  async function handleSubmit(values: Record<string, unknown>) {
    // Only what the API accepts: the read-only block above is display, and `templateKey` is
    // absent from `updateTemplateSchema` on purpose.
    const body = {
      name: values.name,
      description: values.description || undefined,
      icon: values.icon || undefined,
      path: values.path || undefined,
      active: values.active,
    };
    try {
      if (mode === "edit" && id) {
        await setResource(`${PATH}/${id}`, body);
        toast.success(t("templateMaster.updated"));
      } else {
        const query = scope.companyId ? `?companyId=${scope.companyId}` : "";
        await createResource(`${PATH}${query}`, body);
        toast.success(t("templateMaster.created"));
      }
      navigate("/tbac/template-master");
    } catch (error) {
      showError(error);
    }
  }

  const title =
    mode === "create"
      ? t("templateMaster.createTitle")
      : mode === "edit"
        ? t("templateMaster.editTitle")
        : t("templateMaster.viewTitle");

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <MasterPageHeader
        title={title}
        description={template?.templateKey}
        extra={mode === "create" ? scope.control : undefined}
      />

      <FormGenerator
        key={template?.id ?? "new"}
        fields={fields}
        values={template ? (template as unknown as Record<string, unknown>) : undefined}
        maxWidgetsPerRow={2}
        mode={mode}
        submitLabel={
          mode === "edit"
            ? t("action.save", { ns: "common" })
            : t("action.create", { ns: "common" })
        }
        hideSubmitButton={readOnly}
        submitPermission={
          mode === "edit" ? "tbac.template_master.edit" : "tbac.template_master.add"
        }
        onSubmit={handleSubmit}
      />
    </div>
  );
}
