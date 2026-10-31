import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Settings2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LIST_FIELDS } from "@/lib/list-fields";
import type { Role } from "@/types/tbac";

import { DataTable } from "@/components/data-table";
import { IconButton } from "@/components/icon-button";
import { PermissionGate } from "@/components/access-control/permission-gate";
import { useCompanyScope } from "@/components/masters/company-scope-select";
import { MasterPageHeader, SystemBadge, useAuditColumns } from "@/components/masters/master-page";
import { tableFetcher } from "@/lib/masters-api";

const PATH = "/api/tbac/roles";

/** Templates to Role — v4's `/tbac/assignments/roles`. Pick a role to manage. */
export default function RoleTemplatesPage() {
  const { t } = useTranslation(["tbac", "common", "masters"]);
  const navigate = useNavigate();
  const scope = useCompanyScope();

  const fetchRoles = React.useMemo(
    () => tableFetcher<Role>(PATH, scope.companyId ? { companyId: scope.companyId } : {}),
    [scope.companyId],
  );

  const { statusColumn } = useAuditColumns<Role>();

  const columns: ColumnDef<Role, unknown>[] = React.useMemo(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: t("role.fields.name", { ns: "masters" }),
        cell: ({ row }) => (
          <span className="flex items-center justify-center gap-2">
            {row.original.name}
            {row.original.protectedRole && <SystemBadge />}
          </span>
        ),
      },
      {
        id: "description",
        accessorKey: "description",
        header: t("role.fields.description", { ns: "masters" }),
        cell: ({ row }) => row.original.description ?? "-",
      },
      {
        id: "permissions",
        header: t("role.fields.templates", { ns: "masters" }),
        enableColumnFilter: false,
        enableSorting: false,
        cell: ({ row }) => row.original.templateIds.length,
      },
      statusColumn,
      {
        id: "actions",
        header: t("field.actions", { ns: "common" }),
        enableColumnFilter: false,
        enableSorting: false,
        cell: ({ row }) => (
          <PermissionGate permission="tbac.role_template.manage">
            <IconButton
              icon={Settings2}
              label={t("roleTemplates.manage")}
              onClick={() => navigate(`/tbac/assignments/roles/${row.original.id}`)}
            />
          </PermissionGate>
        ),
      },
    ],
    [t, statusColumn, navigate],
  );

  return (
    <div className="p-6">
      <MasterPageHeader
        title={t("roleTemplates.title")}
        description={t("roleTemplates.subtitle")}
        extra={scope.control}
      />

      <DataTable<Role>
        tableId={`tbac-role-templates-${scope.companyId ?? "all"}`}
        listFields={LIST_FIELDS.role}
        configNamespace="tbac.roleTemplates"
        columns={columns}
        fetchData={fetchRoles}
        getRowId={(row) => row.id}
        showRowSelectionColumn={false}
        permission="tbac.role_template.manage"
      />
    </div>
  );
}
