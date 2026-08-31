import { useQuery } from '@tanstack/react-query'
import { getCurrentUser } from '@/api/auth'
import { useAppSelector } from '@/app/hooks'

export const CURRENT_USER_QUERY_KEY = ['me', 'permissions']

/**
 * A Company Admin can be promoted/demoted, or have their designation's access changed, by
 * someone else while this tab stays open -- the sidebar/nav gate on this data but never
 * remount (they live in the persistent layout), and the app disables refetchOnWindowFocus
 * globally, so without a poll here a demoted user would keep seeing admin-only modules
 * indefinitely, not just "until their next login" as the old staleTime: Infinity assumed.
 */
export function useCurrentUser() {
  const isAuthenticated = useAppSelector((state) => Boolean(state.auth.accessToken))
  return useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: getCurrentUser,
    enabled: isAuthenticated,
    staleTime: 60_000,
    refetchInterval: isAuthenticated ? 60_000 : false,
  })
}

/** Same underlying query as useCurrentUser (shared cache, one network call) -- kept for call sites that only care about permissions. */
export function usePermissions() {
  const { data, isLoading } = useCurrentUser()
  return { permissions: data?.permissions, isLoading }
}

/** Hides gated UI (e.g. "Create campaign") until we've confirmed the caller actually holds the key, rather than flashing it and then hiding it. */
export function useHasPermission(key: string): boolean {
  const { permissions, isLoading } = usePermissions()
  if (isLoading || !permissions) return false
  return permissions.includes(key)
}
