import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { CURRENT_USER_QUERY_KEY, useCurrentUser } from '@/hooks/use-current-user'

/**
 * What the signed-in user is allowed to do: the effective access-control keys `GET /api/auth/me`
 * already resolved server-side (role ∪ designation ± per-user overrides), so there is no second
 * request and no way for two sources to disagree. React Query does the caching;
 * `refetchPermissions()` is a one-line invalidation for screens that change someone's access.
 *
 * **This is a UI affordance, never a control.** Every gate here has a matching `@PreAuthorize`
 * on the API, which re-resolves the keys per request. Hiding a button is a convenience; the 403
 * is what actually protects anything.
 */
export interface PermissionContextValue {
  permissions: string[]
  loading: boolean
  error: string | null
  hasPermission: (key: string) => boolean
  hasAnyPermission: (keys: readonly string[]) => boolean
  hasAllPermissions: (keys: readonly string[]) => boolean
  /**
   * The flexible predicate, for places a hook cannot go (a `.filter()` over table actions, a
   * column's `cell`). `undefined` means ungated, an empty array fails closed, arrays are ANY-of
   * unless `requireAll`.
   */
  can: (keys: string | readonly string[] | undefined, options?: { requireAll?: boolean }) => boolean
  refetchPermissions: () => Promise<void>
  /**
   * Wrappzo platform staff: a user with no company (`companyId` null on the profile). Picks the
   * Admin navigation instead of the company one. Never a permission bypass: the platform Super
   * Admin already receives every key from the API.
   */
  isPlatformStaff: boolean
}

const PermissionContext = React.createContext<PermissionContextValue | undefined>(undefined)

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const { data: user, isLoading, error } = useCurrentUser()

  const permissions = React.useMemo<string[]>(() => user?.permissions ?? [], [user?.permissions])
  const granted = React.useMemo(() => new Set(permissions), [permissions])

  const hasPermission = React.useCallback((key: string) => granted.has(key), [granted])
  const hasAnyPermission = React.useCallback(
    (keys: readonly string[]) => keys.some((key) => granted.has(key)),
    [granted],
  )
  const hasAllPermissions = React.useCallback(
    (keys: readonly string[]) => keys.every((key) => granted.has(key)),
    [granted],
  )
  const can = React.useCallback(
    (keys: string | readonly string[] | undefined, options?: { requireAll?: boolean }) => {
      if (keys === undefined) return true
      if (typeof keys === 'string') return granted.has(keys)
      if (keys.length === 0) return false
      return options?.requireAll ? keys.every((key) => granted.has(key)) : keys.some((key) => granted.has(key))
    },
    [granted],
  )
  const refetchPermissions = React.useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY })
  }, [queryClient])

  const value = React.useMemo<PermissionContextValue>(
    () => ({
      permissions,
      loading: isLoading,
      error: error instanceof Error ? error.message : null,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      can,
      refetchPermissions,
      isPlatformStaff: user !== undefined && user.companyId === null,
    }),
    [permissions, isLoading, error, hasPermission, hasAnyPermission, hasAllPermissions, can, refetchPermissions, user],
  )

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>
}

/**
 * Throws outside a provider rather than returning a default: a gate that silently allows or
 * denies everything is a bug that looks like a permissions problem.
 */
export function usePermissions(): PermissionContextValue {
  const context = React.useContext(PermissionContext)
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionProvider')
  }
  return context
}
