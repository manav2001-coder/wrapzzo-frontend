import { usePermissions } from '@/components/permission-provider'

/**
 * Permission checks for the UI. `useHasAccess` is the ONE predicate every gate asks
 * (`PermissionGate`, `PermissionButton`, `ProtectedRoute`, `useNav`, page-level checks) -- never
 * inline `permissions.includes(...)` in a component, or the gates drift apart.
 *
 * For an ARRAY the default is ANY-of (OR); `requireAll` opts into AND. `undefined` means "no
 * requirement" and passes, while an explicitly EMPTY array fails closed: an empty array is a
 * computed value that came back empty, and treating it as "allow" is how a gate silently stops
 * gating.
 *
 * All of this is a UI affordance. The API's `@PreAuthorize` is the actual control.
 */
export { usePermissions } from '@/components/permission-provider'

export function useHasAccess(keys: string | readonly string[] | undefined, requireAll = false): boolean {
  return usePermissions().can(keys, { requireAll })
}
