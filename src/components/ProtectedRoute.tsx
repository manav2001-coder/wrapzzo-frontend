import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAppSelector } from '@/app/hooks'
import { isSuperAdmin } from '@/config/auth'

export function ProtectedRoute() {
  const accessToken = useAppSelector((state) => state.auth.accessToken)
  const email = useAppSelector((state) => state.auth.user?.email)
  const location = useLocation()

  if (!accessToken) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  // Not the security boundary (every endpoint still enforces its own access-control key)
  // -- just keeps a superadmin off the company nav and vice versa. See config/auth.ts.
  const superAdmin = isSuperAdmin(email)
  if (superAdmin && !location.pathname.startsWith('/admin')) {
    return <Navigate to="/admin" replace />
  }
  if (!superAdmin && location.pathname.startsWith('/admin')) {
    return <Navigate to="/campaigns" replace />
  }

  return <Outlet />
}
