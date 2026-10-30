import type { ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";

import { EmptyState } from "@/components/empty-state";
import { useShell } from "@/components/shell-context";
import { Skeleton } from "@/components/ui/skeleton";
import { useHasAccess, usePermissions } from "@/hooks/use-permission";
import type { PermissionKey } from "@/lib/permissions";

export interface ProtectedRouteProps {
  children: ReactNode;
  permission?: PermissionKey;
  permissions?: readonly PermissionKey[];
  requireAll?: boolean;
  /** Also let in anyone with direct reports, whatever their keys -- a manager's own approvals (mirrors the nav's `forManagers`). */
  forManagers?: boolean;
  /** Replaces the default Access Denied panel. */
  fallback?: ReactNode;
}

/**
 * Route-level access control — v4's `ProtectedRoute`.
 *
 * Renders an **Access Denied panel rather than redirecting**, deliberately. A redirect
 * bounces the user somewhere they did not ask to be and destroys the URL, so a shared or
 * bookmarked link just silently lands on the dashboard with no explanation. The panel keeps
 * the URL, says what happened, and offers a way back.
 *
 * `loading` is honoured so the panel never flashes before permissions have resolved — v4
 * shows a loader here for the same reason.
 *
 * Client-side only, like every gate in this app: the API re-checks on every request.
 */
export function ProtectedRoute({
  children,
  permission,
  permissions,
  requireAll = false,
  forManagers = false,
  fallback,
}: ProtectedRouteProps) {
  const { t } = useTranslation();
  const { loading, managesTeam } = usePermissions();
  const { homePath } = useShell();
  const required = permission ?? permissions;
  const hasAccess = useHasAccess(required, requireAll);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (hasAccess || (forManagers && managesTeam)) return <>{children}</>;
  if (fallback) return <>{fallback}</>;

  return (
    <EmptyState
      icon={ShieldAlert}
      title={t("permission.accessDenied")}
      description={t("permission.accessDeniedBody")}
      action={{ label: t("permission.backToDashboard"), to: homePath }}
    />
  );
}

export default ProtectedRoute;
