import { useQuery } from '@tanstack/react-query'
import { getCurrentUser } from '@/api/auth'
import { useAppSelector } from '@/app/hooks'

const CURRENT_USER_QUERY_KEY = ['me', 'permissions']

/** Rarely changes mid-session (a role/company reassignment needs a fresh login to take effect anyway, see JwtService), so this is safe to cache for the whole session. */
export function useCurrentUser() {
  const isAuthenticated = useAppSelector((state) => Boolean(state.auth.accessToken))
  return useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: getCurrentUser,
    enabled: isAuthenticated,
    staleTime: Infinity,
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
