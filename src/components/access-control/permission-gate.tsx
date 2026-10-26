import type { ReactNode } from "react";
import { useHasAccess } from "@/hooks/use-permission";

export interface PermissionGateProps {
  children: ReactNode;
  permission?: string;
  permissions?: readonly string[];
  requireAll?: boolean;
  /** Rendered when access is denied. `null` — hide entirely — is the default, as in v4. */
  fallback?: ReactNode;
}

/**
 * Conditional rendering by permission — v4's `PermissionGate`.
 *
 * Two behaviours look like edge cases and are not:
 *
 *  - **Both props omitted ⇒ render.** `TableAction.permission` and callers that gate
 *    optionally rely on an absent requirement meaning "no gate".
 *  - **`permissions={[]}` ⇒ deny.** An explicitly empty array is a COMPUTED value that came
 *    back empty, not an author saying "ungated". Treating it as "allow" is how a gate
 *    silently stops gating, so it fails closed. Same rule as v4's `areAllTBACFeatures([])`.
 *
 * The admin pass-through mirrors the API's (`resolvePermissions`): an admin always passes a
 * check made up ENTIRELY of `tbac.*` keys, so the Access Control screens stay reachable
 * before any template exists. A mixed check gets no pass-through at all — that is what
 * keeps this from widening into a general bypass.
 */
export function PermissionGate({
  children,
  permission,
  permissions,
  requireAll = false,
  fallback = null,
}: PermissionGateProps) {
  // Called unconditionally and before any early return, so the hook count is stable across
  // renders even when a caller toggles `permission` between a value and `undefined`.
  // (v4's `PermissionButton` calls it inside a branch — a Rules-of-Hooks violation not
  // worth porting.)
  const allowed = useHasAccess(permission ?? permissions, requireAll);

  if (permission === undefined && permissions === undefined) return <>{children}</>;

  return allowed ? <>{children}</> : <>{fallback}</>;
}

export default PermissionGate;
