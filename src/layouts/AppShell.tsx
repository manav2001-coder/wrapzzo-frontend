import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { logout, type TokenResponse } from '../api/auth'

export interface OutletContext {
  accessToken: string
  onError: (message: string) => void
}

const NAV_ITEMS = [
  { to: '/companies', label: 'Companies' },
  { to: '/gifts', label: 'Gifts' },
  { to: '/vendors', label: 'Vendors' },
  { to: '/access-control', label: 'Access Control' },
]

export function AppShell({
  tokens,
  email,
  error,
  onError,
  onLogout,
}: {
  tokens: TokenResponse | null
  email: string
  error: string | null
  onError: (message: string) => void
  onLogout: () => void
}) {
  const navigate = useNavigate()

  if (!tokens) {
    return <Navigate to="/login" replace />
  }

  const activeTokens = tokens

  async function handleLogout() {
    try {
      await logout(activeTokens.refreshToken)
    } catch {
      // best-effort -- clear local state regardless
    }
    onLogout()
    navigate('/login')
  }

  const context: OutletContext = { accessToken: activeTokens.accessToken, onError }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-brand">Wrapzzo</div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span>{email}</span>
          <button className="btn" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </aside>

      <main className="main-content">
        <div className="main-inner">
          {error && <p className="error">Error: {error}</p>}
          <Outlet context={context} />
        </div>
      </main>
    </div>
  )
}
