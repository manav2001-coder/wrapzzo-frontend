import { Menu } from 'primereact/menu'
import { useRef } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAppSelector } from '@/app/hooks'
import { useVendorLogout } from '@/hooks/useVendorAuth'

/**
 * Deliberately not AppLayout -- a single-tab portal doesn't need a
 * multi-module sidebar, and reusing AppLayout would pull in the admin
 * sidebar's NAV_MODULES/session assumptions along with it.
 */
export function VendorLayout() {
  const vendor = useAppSelector((state) => state.vendorAuth.vendor)
  const menuRef = useRef<Menu>(null)
  const navigate = useNavigate()
  const logout = useVendorLogout()

  const initial = vendor?.email ? vendor.email.charAt(0).toUpperCase() : '?'

  return (
    <div className="flex min-h-svh flex-col bg-bg">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-surface px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent font-bold text-white">
              W
            </div>
            <span className="text-lg font-semibold tracking-tight text-text">Wrappzo Vendor</span>
          </div>
          <nav className="hidden items-center gap-1 sm:flex">
            <NavLink
              to="/vendor/orders"
              className={({ isActive }) =>
                [
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  isActive ? 'bg-accent/10 text-accent' : 'text-text-muted hover:bg-surface-muted hover:text-text',
                ].join(' ')
              }
            >
              Orders
            </NavLink>
          </nav>
        </div>

        <button
          type="button"
          className="flex items-center gap-2 rounded-full py-1 pr-1 pl-1 transition-colors hover:bg-surface-muted"
          onClick={(event) => menuRef.current?.toggle(event)}
          aria-label="Account menu"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-sm font-semibold text-white">
            {initial}
          </span>
          <i className="pi pi-chevron-down mr-1 text-[10px] text-text-muted" />
        </button>
        <Menu
          ref={menuRef}
          popup
          className="mt-1 w-56"
          model={[
            {
              template: () => (
                <div className="px-3.5 py-2.5">
                  <p className="text-[11px] tracking-wide text-text-muted uppercase">Signed in as</p>
                  <p className="mt-0.5 truncate text-sm font-medium text-text">{vendor?.email}</p>
                </div>
              ),
            },
            { separator: true },
            {
              label: 'Log out',
              icon: 'pi pi-sign-out',
              command: () => {
                logout()
                navigate('/login', { replace: true })
              },
            },
          ]}
        />
      </header>

      <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="mx-auto w-full max-w-5xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
