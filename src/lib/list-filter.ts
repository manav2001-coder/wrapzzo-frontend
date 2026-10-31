/**
 * The pure half of the master screens' list plumbing (MobixFL's `list-filter.ts`): the filter
 * vocabulary and the sentinel values the shared Status column uses.
 *
 * MobixFL runs a list's filtering, sorting and paging on the server. Wrappzo's lists load whole, so
 * `applyListQuery` does the same job in the browser with the same vocabulary -- which is what lets
 * the ported screens keep their `tableFetcher` / `listResource` calls unchanged.
 */

export type FilterOperator = 'equals' | 'contains' | 'in' | 'gte' | 'lte' | 'between' | 'isNull'

export interface ListFilter {
  field: string
  operator: FilterOperator
  value?: unknown
}

export interface Paginated<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
  totalCapped?: boolean
}

export interface ListParams {
  search?: string
  sort?: string
  sortDir?: 'asc' | 'desc'
  /** The company a platform-staff caller is working on; a company user's own is applied server-side. */
  companyId?: string
  includeInactive?: boolean
  filters?: ListFilter[]
  extra?: Record<string, string>
}

/** The sentinel a `select` filter option carries to mean "this column is EMPTY". */
export const IS_NULL_FILTER_VALUE = '__isNull__'

/**
 * The Status filter's "All" option. An untouched list is the ACTIVE rows (inactive ones are hidden
 * unless asked for); "All" is its own option that asks for both.
 */
export const ALL_STATUSES_FILTER_VALUE = '__allStatuses__'

export function allStatusesFilterOption(label: string): { value: string; label: string } {
  return { value: ALL_STATUSES_FILTER_VALUE, label }
}

type Variant = 'text' | 'select' | 'multiselect' | 'dateRange' | 'numberRange' | undefined

const empty = (part: unknown) => part === undefined || part === null || part === ''

/** A table column filter as the list vocabulary; null when it is no condition at all. */
export function toFilter(field: string, value: unknown, variant?: Variant): ListFilter | null {
  if (empty(value)) return null
  if (value === IS_NULL_FILTER_VALUE) return { field, operator: 'isNull' }
  if (value === ALL_STATUSES_FILTER_VALUE) return null
  if (variant === 'dateRange' || variant === 'numberRange') {
    const [from, to] = Array.isArray(value) ? value : [value, undefined]
    if (!empty(from) && !empty(to)) return { field, operator: 'between', value: [from, to] }
    if (!empty(from)) return { field, operator: 'gte', value: from }
    if (!empty(to)) return { field, operator: 'lte', value: to }
    return null
  }
  if (variant === 'multiselect' || Array.isArray(value)) {
    const items = (Array.isArray(value) ? value : [value]).filter((part) => !empty(part))
    return items.length === 0 ? null : { field, operator: 'in', value: items }
  }
  if (variant === 'select' || typeof value === 'boolean' || typeof value === 'number') return { field, operator: 'equals', value }
  const trimmed = String(value).trim()
  return trimmed ? { field, operator: 'contains', value: trimmed } : null
}

/** An `active` filter is the user asking about inactive rows, so the "hide inactive" default must not also apply. */
export function needsIncludeInactive(filters: ListFilter[]): boolean {
  return filters.some((filter) => filter.field === 'active')
}

const text = (value: unknown) => (value === null || value === undefined ? '' : String(value)).toLowerCase()

function matches(row: Record<string, unknown>, filter: ListFilter): boolean {
  const cell = row[filter.field]
  switch (filter.operator) {
    case 'isNull':
      return cell === null || cell === undefined || cell === ''
    case 'equals':
      return typeof filter.value === 'boolean' ? Boolean(cell) === filter.value : text(cell) === text(filter.value)
    case 'contains':
      return text(cell).includes(text(filter.value))
    case 'in':
      return (filter.value as unknown[]).some((item) => text(item) === text(cell))
    case 'gte':
      return text(cell) >= text(filter.value)
    case 'lte':
      return text(cell) <= text(filter.value)
    case 'between': {
      const [from, to] = filter.value as [unknown, unknown]
      return text(cell) >= text(from) && text(cell) <= text(to)
    }
  }
}

/** Search, filter, sort and page a whole list, the way the server does for MobixFL's. */
export function applyListQuery<T>(rows: T[], page: number, pageSize: number, params: ListParams = {}): Paginated<T> {
  const filters = params.filters ?? []
  const showInactive = params.includeInactive || needsIncludeInactive(filters)
  const needle = params.search?.trim().toLowerCase()
  let result = (rows as Record<string, unknown>[]).filter((row) => {
    if (!showInactive && row.active === false) return false
    if (needle && !Object.values(row).some((value) => (typeof value === 'string' || typeof value === 'number') && text(value).includes(needle))) return false
    return filters.every((filter) => matches(row, filter))
  })
  if (params.sort) {
    const field = params.sort
    const direction = params.sortDir === 'desc' ? -1 : 1
    result = [...result].sort((a, b) => {
      const left = a[field]
      const right = b[field]
      if (typeof left === 'number' && typeof right === 'number') return (left - right) * direction
      return text(left).localeCompare(text(right)) * direction
    })
  }
  const start = page * pageSize
  const slice = result.slice(start, start + pageSize)
  return { data: slice as T[], total: result.length, page, pageSize, hasMore: start + slice.length < result.length }
}
