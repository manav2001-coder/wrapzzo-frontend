import type { Feature } from '@/api/features'
import { VIEW_ACTION } from '@/lib/permissions'

/** One row of the access grid: a module and its actions, view first. */
export interface AccessModule {
  module: string
  label: string
  /** The module's view action, if it has one -- every other action implies it. */
  view: Feature | undefined
  actions: Feature[]
}

/** Groups the catalogue into modules, keeping the catalogue's order (it arrives sorted by sortOrder). */
export function groupByModule(items: readonly Feature[]): AccessModule[] {
  const modules = new Map<string, AccessModule>()
  for (const item of [...items].sort((a, b) => a.sortOrder - b.sortOrder)) {
    const row = modules.get(item.module) ?? { module: item.module, label: item.category, view: undefined, actions: [] }
    if (item.action === VIEW_ACTION) row.view = item
    row.actions.push(item)
    modules.set(item.module, row)
  }
  return [...modules.values()]
}

/**
 * The grants with every implied view added: granting any other action of a module grants its
 * view too. The backend applies the same rule when it saves, so this only makes the grid honest
 * about what will be stored.
 */
export function withImpliedViews(granted: ReadonlySet<string>, modules: readonly AccessModule[]): Set<string> {
  const result = new Set(granted)
  for (const row of modules) {
    if (row.view && row.actions.some((action) => action !== row.view && granted.has(action.id))) result.add(row.view.id)
  }
  return result
}
