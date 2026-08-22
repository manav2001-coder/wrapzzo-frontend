import { ChevronsLeft, ChevronsRight } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const VENDOR_NAV_ITEMS = [
  { label: 'Gifts', to: '/vendor/gifts', icon: 'pi-gift' },
  { label: 'Orders', to: '/vendor/orders', icon: 'pi-shopping-bag' },
]

/**
 * A flat, two-item sidebar -- the vendor portal doesn't need SidebarContent's
 * module-grouping machinery (that's sized for the admin side's five-plus
 * modules), just the same dark-sidebar visual language.
 */
export function VendorSidebarContent({
  collapsed = false,
  onNavigate,
  onToggleCollapse,
}: {
  collapsed?: boolean
  onNavigate?: () => void
  onToggleCollapse?: () => void
}) {
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-fg">
      <div className={`flex h-16 shrink-0 items-center px-4 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent font-bold text-white">
            W
          </div>
          {!collapsed && <span className="text-lg font-semibold tracking-tight text-sidebar-active-fg">Wrappzo Vendor</span>}
        </div>
        {onToggleCollapse && !collapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Collapse sidebar"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-sidebar-fg-muted transition-colors hover:bg-sidebar-hover hover:text-sidebar-fg"
          >
            <ChevronsLeft className="size-4" />
          </button>
        )}
      </div>

      {collapsed && onToggleCollapse && (
        <div className="flex justify-center px-4 pb-2">
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Expand sidebar"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-sidebar-fg-muted transition-colors hover:bg-sidebar-hover hover:text-sidebar-fg"
          >
            <ChevronsRight className="size-4" />
          </button>
        </div>
      )}

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        {VENDOR_NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              [
                'group relative flex items-center gap-3 rounded-md py-2 text-sm font-medium transition-colors',
                collapsed ? 'justify-center px-2' : 'pr-3 pl-3.5',
                isActive
                  ? 'bg-sidebar-active text-sidebar-active-fg'
                  : 'text-sidebar-fg hover:bg-sidebar-hover hover:text-sidebar-active-fg',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                {!collapsed && (
                  <span
                    className={`absolute top-1/2 left-0 h-4 w-0.5 -translate-y-1/2 rounded-full bg-accent transition-opacity ${
                      isActive ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                )}
                <i className={`pi ${item.icon} text-[15px]`} />
                {!collapsed && <span>{item.label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {!collapsed && (
        <div className="border-t border-sidebar-border px-4 py-3 text-xs text-sidebar-fg-muted">Wrappzo &middot; v1</div>
      )}
    </div>
  )
}
