import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Settings2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LIST_FIELDS } from "@/lib/list-fields";
import type { Template } from "@/types/tbac";

import { DataTable } from "@/components/data-table";
import { IconButton } from "@/components/icon-button";
import { PermissionGate } from "@/components/access-control/permission-gate";
import { useCompanyScope } from "@/components/masters/company-scope-select";
import { MasterPageHeader, StatusCell, SystemBadge } from "@/components/masters/master-page";
import { tableFetcher } from "@/lib/masters-api";

const PATH = "/api/tbac/templates";

/** Templates to Template — v4's `/tbac/templates-to-template`. Pick a template to compose. */
export default function TemplatesToTemplatePage() {
  const { t } = useTranslation(["tbac", "common"]);
  const navigate = useNavigate();
  const scope = useCompanyScope();

  const fetchTemplates = React.useMemo(
    () => tableFetcher<Template>(PATH, scope.companyId ? { companyId: scope.companyId } : {}),
    [scope.companyId],
  );

  const columns: ColumnDef<Template, unknown>[] = React.useMemo(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: t("templateMaster.fields.name"),
        cell: ({ row }) => (
          <span className="flex items-center gap-2">
            {row.original.name}
            {row.original.isSystem && <SystemBadge />}
          </span>
        ),
      },
      {
        id: "templateKey",
        accessorKey: "templateKey",
        header: t("templateMaster.fields.templateKey"),
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.templateKey}</span>,
      },
      {
        id: "description",
        accessorKey: "description",
        header: t("templateMaster.fields.description"),
        cell: ({ row }) => row.original.description ?? "-",
      },
      {
        id: "active",
        accessorKey: "active",
        header: t("field.status", { ns: "common" }),
        meta: {
          filterVariant: "select",
          filterOptions: [
            { value: true, label: t("field.active", { ns: "common" }) },
            { value: false, label: t("field.inactive", { ns: "common" }) },
          ],
        },
        cell: ({ row }) => <StatusCell active={row.original.active} />,
      },
      {
        id: "actions",
        header: t("field.actions", { ns: "common" }),
        enableColumnFilter: false,
        enableSorting: false,
        cell: ({ row }) => (
          <PermissionGate permission="tbac.templates_to_template.manage">
            <IconButton
              icon={Settings2}
              label={t("templatesToTemplate.manage")}
              onClick={() => navigate(`/tbac/templates-to-template/${row.original.id}`)}
            />
          </PermissionGate>
        ),
      },
    ],
    [t, navigate],
  );

  return (
    <div className="p-6">
      <MasterPageHeader
        title={t("templatesToTemplate.title")}
        description={t("templatesToTemplate.subtitle")}
        extra={scope.control}
      />

      <DataTable<Template>
        tableId={`tbac-t2t-${scope.companyId ?? "all"}`}
        listFields={LIST_FIELDS.template}
        configNamespace="tbac.templatesToTemplate"
        columns={columns}
        fetchData={fetchTemplates}
        getRowId={(row) => row.id}
        showRowSelectionColumn={false}
        permission="tbac.templates_to_template.manage"
      />
    </div>
  );
}
