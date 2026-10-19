import { ChevronDown, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { isSuperAdmin } from '@/config/auth'
import { getNavModules, type NavEntry, type NavModule } from '@/config/navigation'
import { toggleModuleExpanded } from '@/features/ui/uiSlice'
import { usePermissions } from '@/hooks/usePermissions'

/** A link with no requiresPermission is always visible; an array means "holds any one of these". */
function isLinkVisible(requiresPermission: string | string[] | undefined, permissions: string[] | undefined): boolean {
  if (!requiresPermission) return true
  const required = Array.isArray(requiresPermission) ? requiresPermission : [requiresPermission]
  return required.some((key) => permissions?.includes(key) ?? false)
}

/** True if the current path is exactly one of a group's links, or nested under one. */
function isPathInGroup(pathname: string, items: NavEntry[]): boolean {
  return items.some((item) => item.type === 'link' && (pathname === item.to || pathname.startsWith(`${item.to}/`)))
}

/** Every group key whose own links match the current path -- at any depth. */
function groupKeysContainingPath(pathname: string, entries: NavEntry[]): string[] {
  const keys: string[] = []
  for (const entry of entries) {
    if (entry.type === 'group') {
      if (isPathInGroup(pathname, entry.items)) {
        keys.push(entry.key)
      }
      keys.push(...groupKeysContainingPath(pathname, entry.items))
    }
  }
  return keys
}

function NavLeafLink({ item, collapsed, onNavigate }: { item: Extract<NavEntry, { type: 'link' }>; collapsed: boolean; onNavigate?: () => void }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        [
          'group relative flex items-center gap-3 rounded-md py-2 text-sm font-medium transition-colors',
          collapsed ? 'justify-center px-2' : 'pr-3 pl-3.5',
          isActive ? 'bg-sidebar-active text-sidebar-active-fg' : 'text-sidebar-fg hover:bg-sidebar-hover hover:text-sidebar-active-fg',
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
  )
}

/** Renders one level of NavEntry[] -- a flat link renders directly; a nested group renders
 *  its own expand/collapse header (reusing the same expandedModules state as top-level
 *  modules) and, when collapsed to the icon rail, is flattened to just its child links so
 *  there's no dead sub-header with nothing to click. */
function NavEntries({
  entries,
  depth,
  collapsed,
  expandedModules,
  onToggle,
  onNavigate,
  permissions,
}: {
  entries: NavEntry[]
  depth: number
  collapsed: boolean
  expandedModules: string[]
  onToggle: (key: string) => void
  onNavigate?: () => void
  /** undefined while still loading -- gated links stay hidden until we've confirmed the key, rather than flashing then hiding. */
  permissions: string[] | undefined
}) {
  const visibleEntries = entries.filter((entry) => entry.type !== 'link' || isLinkVisible(entry.requiresPermission, permissions))
  const location = useLocation()
  return (
    <div className={depth > 0 ? 'mt-0.5 ml-3 space-y-0.5 border-l border-sidebar-border pl-2' : 'space-y-0.5'}>
      {visibleEntries.map((entry) => {
        if (entry.type === 'link') {
          return <NavLeafLink key={entry.to} item={entry} collapsed={collapsed} onNavigate={onNavigate} />
        }
        if (collapsed) {
          // Icon-only rail: no room for a sub-header, so surface its links directly.
          return (
            <div key={entry.key} className="space-y-0.5">
              {entry.items
                .filter((item) => isLinkVisible(item.requiresPermission, permissions))
                .map((item) => (
                  <NavLeafLink key={item.to} item={item} collapsed={collapsed} onNavigate={onNavigate} />
                ))}
            </div>
          )
        }
        const isExpanded = expandedModules.includes(entry.key)
        // Only looks "active" once you're actually on one of its own routes (Create/Manage) --
        // not just because it happens to be expanded.
        const isChildActive = isPathInGroup(location.pathname, entry.items)
        return (
          <div key={entry.key}>
            <button
              type="button"
              onClick={() => onToggle(entry.key)}
              className={[
                // bg-transparent explicitly, not just omitted -- there's no Tailwind preflight in
                // this app (see index.css), so a plain <button> with no background utility at all
                // falls back to PrimeReact's own default button chrome (a solid gray fill).
                'flex w-full items-center gap-2 rounded-md border-none bg-transparent py-1.5 pr-3 pl-3.5 text-sm font-medium transition-colors',
                isChildActive
                  ? 'bg-sidebar-hover text-sidebar-active-fg'
                  : 'text-sidebar-fg hover:bg-sidebar-hover hover:text-sidebar-active-fg',
              ].join(' ')}
            >
              <i className={`pi ${entry.icon} text-[15px]`} />
              <span className="flex-1 text-left">{entry.label}</span>
              {isExpanded ? <ChevronDown className="size-3.5 shrink-0" /> : <ChevronRight className="size-3.5 shrink-0" />}
            </button>
            {isExpanded && (
              <NavEntries
                entries={entry.items}
                depth={depth + 1}
                collapsed={collapsed}
                expandedModules={expandedModules}
                onToggle={onToggle}
                onNavigate={onNavigate}
                permissions={permissions}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

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
  const { permissions } = usePermissions()
  const location = useLocation()

  // Auto-open a group once you actually land on one of its own routes (e.g. refreshing on
  // /campaigns), so the active item is never hidden inside a collapsed group -- but this
  // never forces it open just because it's expanded/highlighted for any other reason.
  useEffect(() => {
    for (const mod of navModules as NavModule[]) {
      for (const key of groupKeysContainingPath(location.pathname, mod.items)) {
        if (!expandedModules.includes(key)) {
          dispatch(toggleModuleExpanded(key))
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  function handleToggle(key: string) {
    dispatch(toggleModuleExpanded(key))
  }

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
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md border-none bg-transparent text-sidebar-fg-muted transition-colors hover:bg-sidebar-hover hover:text-sidebar-fg"
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
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md border-none bg-transparent text-sidebar-fg-muted transition-colors hover:bg-sidebar-hover hover:text-sidebar-fg"
          >
            <ChevronsRight className="size-4" />
          </button>
        </div>
      )}

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {navModules.map((mod) => {
          if (mod.flat) {
            return (
              <NavEntries
                key={mod.key}
                entries={mod.items}
                depth={0}
                collapsed={collapsed}
                expandedModules={expandedModules}
                onToggle={handleToggle}
                onNavigate={onNavigate}
                permissions={permissions}
              />
            )
          }
          const isExpanded = collapsed || expandedModules.includes(mod.key)
          return (
            <div key={mod.key}>
              <button
                type="button"
                title={collapsed ? mod.label : undefined}
                onClick={() => !collapsed && handleToggle(mod.key)}
                className={[
                  'flex w-full items-center gap-2 rounded-md border-none bg-transparent px-2 py-1.5 text-[11px] font-semibold tracking-wider text-sidebar-fg-muted uppercase transition-colors',
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
                <div className="mt-0.5">
                  <NavEntries
                    entries={mod.items}
                    depth={0}
                    collapsed={collapsed}
                    expandedModules={expandedModules}
                    onToggle={handleToggle}
                    onNavigate={onNavigate}
                    permissions={permissions}
                  />
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
