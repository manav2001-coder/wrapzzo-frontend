import { MoreHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";

import { usePermissions } from "@/hooks/use-permission";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PermissionGate } from "@/components/access-control/permission-gate";
import type { TableAction, TableActionContext } from "@/components/data-table/types";

const MAX_PRIMARY = 3;

interface ActionsToolbarProps<TData> {
  primaryActions?: TableAction<TData>[];
  secondaryActions?: TableAction<TData>[];
  context: TableActionContext<TData>;
}

export function ActionsToolbar<TData>({
  primaryActions = [],
  secondaryActions = [],
  context,
}: ActionsToolbarProps<TData>) {
  const { t } = useTranslation();
  const { can } = usePermissions();
  const visiblePrimary = primaryActions.filter((a) => !a.hidden?.(context.rowSelection));
  const shown = visiblePrimary.slice(0, MAX_PRIMARY);
  const overflow = [
    ...visiblePrimary.slice(MAX_PRIMARY),
    ...secondaryActions.filter((a) => !a.hidden?.(context.rowSelection)),
  ];

  if (shown.length === 0 && overflow.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      {shown.map((action) => {
        const allowed = can(action.permission);
        if (!allowed && (action.hideIfNoPermission ?? true)) return null;
        return (
          <Button
            key={action.label}
            variant="outline"
            size="sm"
            disabled={!allowed || action.disabled?.(context.rowSelection)}
            onClick={() => action.onClick(context)}
          >
            {action.icon}
            {action.label}
          </Button>
        );
      })}
      {overflow.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" aria-label={t("table.moreActions")}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {overflow.map((action) => (
              <PermissionGate
                key={action.label}
                // `TableAction.permission` is `string | string[]`, and the gate takes those
                // as two separate props (v4's shape) — an array in `permission` would be
                // compared as a string and never match.
                permission={typeof action.permission === "string" ? action.permission : undefined}
                permissions={Array.isArray(action.permission) ? action.permission : undefined}
              >
                <DropdownMenuItem
                  disabled={action.disabled?.(context.rowSelection)}
                  onClick={() => action.onClick(context)}
                >
                  {action.icon}
                  {action.label}
                </DropdownMenuItem>
              </PermissionGate>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
