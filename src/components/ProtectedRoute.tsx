import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAppSelector } from '@/app/hooks'
import { usePermissions } from '@/hooks/use-permission'

/** Screens every signed-in user has, platform staff and company users alike. */
const SHARED_PATHS = ['/home', '/settings', '/components', '/tbac', '/masters']

/**
 * The signed-in gate for platform and company users. Also keeps each audience on its own side --
 * platform staff (no company on the profile) in /admin, company users out of it -- the same signal
 * the sidebar uses to pick its tree. Not the security boundary: every endpoint still enforces its
 * own access-control key.
 */
export function ProtectedRoute() {
  const accessToken = useAppSelector((state) => state.auth.accessToken)
  const { isPlatformStaff, loading } = usePermissions()
  const location = useLocation()

  if (!accessToken) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  // Until the profile says which side this user is on, there is nothing to correct.
  const shared = SHARED_PATHS.some((path) => location.pathname.startsWith(path))
  if (loading || shared) return <Outlet />

  const inAdmin = location.pathname.startsWith('/admin')
  if (isPlatformStaff && !inAdmin) return <Navigate to="/home" replace />
  if (!isPlatformStaff && inAdmin) return <Navigate to="/home" replace />

  return <Outlet />
}
