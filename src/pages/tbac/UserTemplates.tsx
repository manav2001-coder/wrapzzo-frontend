import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Settings2, UsersRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { LIST_FIELDS } from "@/lib/list-fields";
import { formatPhoneForDisplay } from "@/lib/format";
import type { PublicUser } from "@/types/tbac";

import { DataTable } from "@/components/data-table";
import { IconButton } from "@/components/icon-button";
import { PermissionGate } from "@/components/access-control/permission-gate";
import { useCompanyScope } from "@/components/masters/company-scope-select";
import { MasterPageHeader, useAuditColumns } from "@/components/masters/master-page";
import { tableFetcher } from "@/lib/masters-api";

const PATH = "/api/tbac/users";

/**
 * Templates to User — v4's `/tbac/assignments/users`.
 *
 * Pick one person to manage, or select several and assign in bulk. v4 requires ≥2 rows
 * before enabling the bulk action, and that is right: the single-user screen is a better
 * place to do one, because it shows what they already hold.
 *
 * v4 hands the selection over in `sessionStorage`. This uses router navigation state
 * instead — same effect, but it cannot outlive the navigation and reappear days later, and a
 * reload lands on a screen that can say "nothing selected" rather than acting on stale ids.
 */
export default function UserTemplatesPage() {
  const { t } = useTranslation(["tbac", "common", "masters"]);
  const navigate = useNavigate();
  const scope = useCompanyScope();

  const fetchUsers = React.useMemo(
    () =>
      tableFetcher<PublicUser>(PATH, scope.companyId ? { companyId: scope.companyId } : {}),
    [scope.companyId],
  );

  const { statusColumn } = useAuditColumns<PublicUser>();

  const columns: ColumnDef<PublicUser, unknown>[] = React.useMemo(
    () => [
      { id: "name", accessorKey: "name", header: t("user.fields.name", { ns: "masters" }) },
      { id: "email", accessorKey: "email", header: t("user.fields.email", { ns: "masters" }) },
      {
        id: "mobile",
        accessorKey: "mobile",
        header: t("user.fields.mobile", { ns: "masters" }),
        cell: ({ row }) => formatPhoneForDisplay(row.original.mobile) ?? "-",
      },
      statusColumn,
      {
        id: "actions",
        header: t("field.actions", { ns: "common" }),
        enableColumnFilter: false,
        enableSorting: false,
        cell: ({ row }) => (
          <PermissionGate permission="tbac.user_template.manage">
            <IconButton
              icon={Settings2}
              label={t("userTemplates.manage")}
              onClick={() => navigate(`/tbac/assignments/users/${row.original.id}`)}
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
        title={t("userTemplates.title")}
        description={t("userTemplates.subtitle")}
        extra={scope.control}
      />

      <DataTable<PublicUser>
        tableId={`tbac-user-templates-${scope.companyId ?? "all"}`}
        listFields={LIST_FIELDS.user}
        configNamespace="tbac.userTemplates"
        columns={columns}
        fetchData={fetchUsers}
        getRowId={(row) => row.id}
        showRowSelectionColumn
        permission="tbac.user_template.manage"
        primaryActions={[
          {
            label: t("userTemplates.bulkAssign"),
            icon: <UsersRound className="h-4 w-4" />,
            permission: "tbac.bulk_assign_user_templates",
            // v4's rule: one user is better served by their own screen, which also shows
            // what they already hold.
            disabled: (rowSelection) => Object.keys(rowSelection).length <= 1,
            onClick: ({ selectedRows }) => {
              if (selectedRows.length <= 1) {
                toast.error(t("userTemplates.bulkAssignHint"));
                return;
              }
              navigate("/tbac/assignments/users/bulk-assign", {
                state: {
                  users: selectedRows.map((row) => ({
                    id: row.id,
                    name: row.name,
                    email: row.email,
                  })),
                },
              });
            },
          },
        ]}
      />
    </div>
  );
}
