import { apiClient } from '@/lib/axiosClient'
import type { FetchOptions, FetchResult } from '@/components/data-table/types'
import {
  ALL_STATUSES_FILTER_VALUE,
  applyListQuery,
  needsIncludeInactive,
  toFilter,
  type ListFilter,
  type ListParams,
  type Paginated,
} from '@/lib/list-filter'

export type { ListParams } from '@/lib/list-filter'

/**
 * The one place the master screens talk to the API -- MobixFL's `masters-api`, with the same
 * functions and signatures so its screens port unchanged.
 *
 * MobixFL's lists page, search, sort and filter on the server. Wrappzo's list endpoints return the
 * whole list, so this reads it and does that work with `applyListQuery`; everything else (get,
 * create, set, deactivate) is a plain call.
 */

/** The page-size cap MobixFL's API enforces; kept so pickers ask the same way. */
export const MAX_PAGE_SIZE = 100

function queryOf(params: ListParams): Record<string, string> {
  const query: Record<string, string> = { ...(params.extra ?? {}) }
  if (params.companyId) query.companyId = params.companyId
  return query
}

async function readAll<T>(path: string, params: ListParams): Promise<T[]> {
  const { data } = await apiClient.get<T[]>(path, { params: queryOf(params) })
  return Array.isArray(data) ? data : []
}

/** A plain paginated read, for screens that are not a `DataTable`. */
export async function listResource<T>(path: string, page: number, pageSize: number, params: ListParams = {}): Promise<Paginated<T>> {
  return applyListQuery(await readAll<T>(path, params), page, Math.min(pageSize, MAX_PAGE_SIZE), params)
}

/** Every row, for the option pickers. */
export async function listAll<T>(path: string, params: ListParams = {}): Promise<T[]> {
  const rows = await readAll<T>(path, params)
  return applyListQuery(rows, 0, Math.max(rows.length, 1), params).data
}

/** One page of `rows` for a `DataTable` `fetchData` call: its filters, search, sort and paging applied. */
function pageOf<T>(rows: T[], options: FetchOptions, params: ListParams): FetchResult<T> {
  const tableFilters = options.filters
    .map((filter) => toFilter(filter.field, filter.value, filter.variant))
    .filter((filter): filter is ListFilter => filter !== null)
  const filters = [...(params.filters ?? []), ...tableFilters]
  const effective: ListParams = {
    ...params,
    filters,
    search: options.search ?? params.search,
    sort: options.sort ?? params.sort,
    sortDir: options.sort ? (options.sortDir ?? 'asc') : params.sortDir,
    includeInactive:
      params.includeInactive || needsIncludeInactive(filters) || options.filters.some((filter) => filter.value === ALL_STATUSES_FILTER_VALUE),
  }
  const page = applyListQuery(rows, options.pageIndex, options.pageSize, effective)
  return {
    rows: page.data,
    pageCount: Math.max(1, Math.ceil(page.total / (page.pageSize || options.pageSize))),
    totalCount: page.total,
  }
}

/** `DataTable`'s `fetchData` for a master endpoint. */
export function tableFetcher<T>(path: string, params: ListParams = {}) {
  return async (options: FetchOptions): Promise<FetchResult<T>> => pageOf(await readAll<T>(path, params), options, params)
}

/**
 * `fetchData` over rows the screen already holds (the query it refetches after every change). Rows
 * that spell "active" their own way (`status: "ACTIVE"`) get the `active` flag the Status filter and
 * its default -- active rows only -- run on.
 */
export function rowsFetcher<T>(rows: T[], isActive: (row: T) => boolean) {
  const withActive = rows.map((row) => ({ ...row, active: isActive(row) }))
  return async (options: FetchOptions): Promise<FetchResult<T>> => pageOf(withActive, options, {})
}

export async function getResource<T>(path: string): Promise<T> {
  const { data } = await apiClient.get<T>(path)
  return data
}

export async function createResource<T>(path: string, json: unknown): Promise<T> {
  const { data } = await apiClient.post<T>(path, json)
  return data
}

export async function updateResource<T>(path: string, json: unknown): Promise<T> {
  const { data } = await apiClient.patch<T>(path, json)
  return data
}

/** Bulk replace-all endpoints. */
export async function setResource<T>(path: string, json: unknown): Promise<T> {
  const { data } = await apiClient.put<T>(path, json)
  return data
}

/** `DELETE` -- the masters soft-delete and answer with the updated row; detach endpoints answer 204. */
export async function deactivateResource<T>(path: string, json?: unknown): Promise<T> {
  const { data } = await apiClient.delete<T>(path, json === undefined ? undefined : { data: json })
  return data
}

/** A POST that is an ACTION rather than a create. */
export async function postAction<T = void>(path: string, json?: unknown): Promise<T> {
  const { data } = await apiClient.post<T>(path, json)
  return data
}
