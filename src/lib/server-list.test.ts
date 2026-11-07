import { beforeEach, describe, expect, it, vi } from 'vitest'

import { countOf, listQueryParams, serverFetcher } from './server-list'

const get = vi.hoisted(() => vi.fn())
vi.mock('@/lib/axiosClient', () => ({ apiClient: { get } }))

describe('server lists', () => {
  beforeEach(() => get.mockReset().mockResolvedValue({ data: { data: [{ id: 'a' }], total: 53, page: 2, pageSize: 25, hasMore: true } }))

  it('sends the table state as a query: page, size, search, sort and the filters as JSON', () => {
    const params = listQueryParams({
      pageIndex: 2,
      pageSize: 25,
      search: 'asha',
      sort: 'createdAt',
      sortDir: 'desc',
      filters: [
        { field: 'status', value: 'DELIVERED', filterType: 'column', variant: 'select' },
        { field: 'quantity', value: ['5', '20'], filterType: 'column', variant: 'numberRange' },
        { field: 'recipientName', value: '', filterType: 'column' },
      ],
    })
    expect(params).toMatchObject({ page: 2, size: 25, search: 'asha', sort: 'createdAt', dir: 'desc' })
    expect(JSON.parse(String(params.filters))).toEqual([
      { field: 'status', operator: 'equals', value: 'DELIVERED' },
      { field: 'quantity', operator: 'between', value: ['5', '20'] },
    ])
  })

  it('leaves out what is not asked for', () => {
    expect(listQueryParams({ pageIndex: 0, pageSize: 10, filters: [] })).toEqual({ page: 0, size: 10 })
  })

  it("puts the screen's own filters first, then the table's", () => {
    const params = listQueryParams(
      { pageIndex: 0, pageSize: 10, filters: [{ field: 'status', value: 'DELIVERED', filterType: 'column', variant: 'select' }] },
      [{ field: 'hasPendingDesignReview', operator: 'equals', value: true }],
    )
    expect(JSON.parse(String(params.filters)).map((f: { field: string }) => f.field)).toEqual(['hasPendingDesignReview', 'status'])
  })

  it('turns a page into the rows and page count the table reads', async () => {
    const result = await serverFetcher<{ id: string }>('/api/orders/page', [], { companyId: 'c-1' })({ pageIndex: 2, pageSize: 25, filters: [] })

    expect(get).toHaveBeenCalledWith('/api/orders/page', { params: { companyId: 'c-1', page: 2, size: 25 } })
    expect(result).toEqual({ rows: [{ id: 'a' }], pageCount: 3, totalCount: 53 })
  })

  it('counts a list by reading the total of a page of one', async () => {
    expect(await countOf('/api/order-approvals/pending/page')).toBe(53)
    expect(get).toHaveBeenCalledWith('/api/order-approvals/pending/page', { params: { page: 0, size: 1 } })
  })
})
