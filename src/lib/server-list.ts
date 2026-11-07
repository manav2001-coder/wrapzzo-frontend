import type { FetchOptions, FetchResult } from '@/components/data-table/types'
import { apiClient } from '@/lib/axiosClient'
import { toFilter, type ListFilter, type Paginated } from '@/lib/list-filter'

/**
 * Lists that are paged, searched, filtered and sorted by the SERVER: the table sends what the user asked for, and only that page
 * comes back. (masters-api.ts' fetchers read a whole list and do the same work in the browser -- right for the small master lists,
 * wrong for orders, doctors and users, which grow without bound.)
 */

/** The query string of a list endpoint: page (from 0), size, search, sort, dir and the filters as a JSON array. */
export function listQueryParams(options: FetchOptions, fixedFilters: ListFilter[] = []): Record<string, string | number> {
  const tableFilters = options.filters
    .map((filter) => toFilter(filter.field, filter.value, filter.variant))
    .filter((filter): filter is ListFilter => filter !== null)
  const filters = [...fixedFilters, ...tableFilters]
  const params: Record<string, string | number> = { page: options.pageIndex, size: options.pageSize }
  if (options.search) params.search = options.search
  if (options.sort) {
    params.sort = options.sort
    params.dir = options.sortDir ?? 'asc'
  }
  if (filters.length > 0) params.filters = JSON.stringify(filters)
  return params
}

/** The HTTP client a list is read with: the signed-in user's, or the vendor portal's own. */
export type ListClient = Pick<typeof apiClient, 'get'>

/** One page of a server list, in the shape the screens read. */
export async function fetchPage<T>(
  path: string,
  options: FetchOptions,
  fixedFilters: ListFilter[] = [],
  extra: Record<string, string> = {},
  client: ListClient = apiClient,
): Promise<Paginated<T>> {
  const { data } = await client.get<Paginated<T>>(path, { params: { ...extra, ...listQueryParams(options, fixedFilters) } })
  return data
}

/** `DataTable`'s `fetchData` for a server list. `fixedFilters` are the screen's own (a tab, a chosen company) on top of the table's. */
export function serverFetcher<T>(path: string, fixedFilters: ListFilter[] = [], extra: Record<string, string> = {}, client: ListClient = apiClient) {
  return async (options: FetchOptions): Promise<FetchResult<T>> => {
    const page = await fetchPage<T>(path, options, fixedFilters, extra, client)
    return { rows: page.data, pageCount: Math.max(1, Math.ceil(page.total / (page.pageSize || options.pageSize))), totalCount: page.total }
  }
}

/** How many rows a list holds, for a badge or a count: asks for a page of one and reads the total. */
export async function countOf(path: string, fixedFilters: ListFilter[] = [], extra: Record<string, string> = {}, client: ListClient = apiClient): Promise<number> {
  const page = await fetchPage<unknown>(path, { pageIndex: 0, pageSize: 1, filters: [] }, fixedFilters, extra, client)
  return page.total
}
