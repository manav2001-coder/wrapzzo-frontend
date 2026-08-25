import { ChevronDown, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { isSuperAdmin } from '@/config/auth'
import { getNavModules } from '@/config/navigation'
import { toggleModuleExpanded } from '@/features/ui/uiSlice'

export function SidebarContent({
  collapsed = false,
  onNavigate,
  onToggleCollapse,
}: {
  collapsed?: boolean
  onNavigate?: () => void
  /** Only passed by the desktop rail -- the mobile drawer closes instead of collapsing. */
  onToggleCollapse?: () => void
}) {
  const dispatch = useAppDispatch()
  const expandedModules = useAppSelector((state) => state.ui.expandedModules)
  const email = useAppSelector((state) => state.auth.user?.email)
  const navModules = getNavModules(isSuperAdmin(email))

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-fg">
      <div className={`flex h-16 shrink-0 items-center px-4 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent font-bold text-white">
            W
          </div>
          {!collapsed && <span className="text-lg font-semibold tracking-tight text-sidebar-active-fg">Wrappzo</span>}
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

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {navModules.map((mod) => {
          const isExpanded = collapsed || expandedModules.includes(mod.key)
          return (
            <div key={mod.key}>
              <button
                type="button"
                title={collapsed ? mod.label : undefined}
                onClick={() => !collapsed && dispatch(toggleModuleExpanded(mod.key))}
                className={[
                  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[11px] font-semibold tracking-wider text-sidebar-fg-muted uppercase transition-colors',
                  collapsed ? 'justify-center' : 'hover:text-sidebar-fg',
                ].join(' ')}
              >
                {!collapsed &&
                  (isExpanded ? (
                    <ChevronDown className="size-3 shrink-0 text-sidebar-fg-muted" />
                  ) : (
                    <ChevronRight className="size-3 shrink-0 text-sidebar-fg-muted" />
                  ))}
                <span className={collapsed ? '' : 'flex-1 text-left'}>{collapsed ? <i className={`pi ${mod.icon}`} /> : mod.label}</span>
              </button>

              {isExpanded && (
                <div className="mt-0.5 space-y-0.5">
                  {mod.items.map((item) => (
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
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {!collapsed && (
        <div className="border-t border-sidebar-border px-4 py-3 text-xs text-sidebar-fg-muted">Wrappzo &middot; v1</div>
      )}
    </div>
  )
}
