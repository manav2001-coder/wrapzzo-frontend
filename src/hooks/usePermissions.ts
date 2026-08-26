import { useQuery } from '@tanstack/react-query'
import { getCurrentUserPermissions } from '@/api/auth'
import { useAppSelector } from '@/app/hooks'

/** Rarely changes mid-session (a role reassignment needs a fresh login to take effect anyway, see JwtService), so this is safe to cache for the whole session. */
export function usePermissions() {
  const isAuthenticated = useAppSelector((state) => Boolean(state.auth.accessToken))
  const query = useQuery({
    queryKey: ['me', 'permissions'],
    queryFn: getCurrentUserPermissions,
    enabled: isAuthenticated,
    staleTime: Infinity,
  })
  return { permissions: query.data, isLoading: query.isLoading }
}

/** Hides gated UI (e.g. "Create campaign") until we've confirmed the caller actually holds the key, rather than flashing it and then hiding it. */
export function useHasPermission(key: string): boolean {
  const { permissions, isLoading } = usePermissions()
  if (isLoading || !permissions) return false
  return permissions.includes(key)
}
