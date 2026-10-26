import { useQuery } from '@tanstack/react-query'
import { getCurrentUser } from '@/api/auth'
import { useAppSelector } from '@/app/hooks'

export const CURRENT_USER_QUERY_KEY = ['me'] as const

/**
 * The signed-in company/platform user's profile: effective access-control keys and their own
 * company. `PermissionProvider` derives every permission gate from this one query.
 *
 * Polled, because a Company Admin can be promoted/demoted, or have their designation's access
 * changed, by someone else while this tab stays open -- the sidebar gates on this data but lives
 * in the persistent layout and never remounts, and the app disables refetchOnWindowFocus
 * globally, so without a poll a demoted user would keep seeing admin-only modules indefinitely.
 *
 * Disabled for a vendor session (no user token): the vendor portal has no permission set.
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
