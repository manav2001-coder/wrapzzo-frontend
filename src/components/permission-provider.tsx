import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { CURRENT_USER_QUERY_KEY, useCurrentUser } from '@/hooks/use-current-user'
import type { PermissionKey, PermissionRequirement } from '@/lib/permissions'

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
  hasPermission: (key: PermissionKey) => boolean
  hasAnyPermission: (keys: readonly PermissionKey[]) => boolean
  hasAllPermissions: (keys: readonly PermissionKey[]) => boolean
  /**
   * The flexible predicate, for places a hook cannot go (a `.filter()` over table actions, a
   * column's `cell`). `undefined` means ungated, an empty array fails closed, arrays are ANY-of
   * unless `requireAll`.
   */
  can: (keys: PermissionRequirement | undefined, options?: { requireAll?: boolean }) => boolean
  refetchPermissions: () => Promise<void>
  /**
   * Wrappzo platform staff: a user with no company (`companyId` null on the profile). Picks the
   * Admin navigation instead of the company one. Never a permission bypass: the platform Super
   * Admin already receives every key from the API.
   */
  isPlatformStaff: boolean
  /**
   * Someone reports to this user. Reviewing a direct report's doctor request rests on the
   * reporting line, not on a key, so it can't be expressed through `can()`.
   */
  managesTeam: boolean
  /**
   * Sees the whole company (platform staff always do). Only they may change who sees what -- a
   * user's placement, extra units, admin status -- so those controls hide for everyone else.
   */
  companyWide: boolean
}

const PermissionContext = React.createContext<PermissionContextValue | undefined>(undefined)

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const { data: user, isLoading, error } = useCurrentUser()

  const permissions = React.useMemo<string[]>(() => user?.permissions ?? [], [user?.permissions])
  const granted = React.useMemo(() => new Set(permissions), [permissions])

  const hasPermission = React.useCallback((key: PermissionKey) => granted.has(key), [granted])
  const hasAnyPermission = React.useCallback(
    (keys: readonly PermissionKey[]) => keys.some((key) => granted.has(key)),
    [granted],
  )
  const hasAllPermissions = React.useCallback(
    (keys: readonly PermissionKey[]) => keys.every((key) => granted.has(key)),
    [granted],
  )
  const can = React.useCallback(
    (keys: PermissionRequirement | undefined, options?: { requireAll?: boolean }) => {
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
      managesTeam: user?.managesTeam === true,
      companyWide: user !== undefined && (user.companyId === null || user.companyWide === true),
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
