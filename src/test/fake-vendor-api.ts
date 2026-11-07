import type { VendorOrder } from '@/api/vendorOrders'
import { vendorStageOf } from '@/lib/vendor-order-stage'

/**
 * The vendor API as the server answers it, for tests: a page of the vendor's orders (narrowed by the stage and division filters the table
 * sends), the counts by stage, and the divisions the orders came from. (The server works the stage out in SQL; the backend tests hold it
 * to the same rules as vendorStageOf, which this uses.)
 */
export function fakeVendorApi(orders: VendorOrder[]) {
  return async (url: string, config?: { params?: Record<string, unknown> }) => {
    const filters = JSON.parse(String(config?.params?.filters ?? '[]')) as { field: string; operator: string; value: string }[]
    const division = (config?.params?.divisionId as string | undefined) ?? filters.find((f) => f.field === 'divisionId')?.value
    const inDivision = orders.filter((o) => !division || o.divisionId === division)
    if (url === '/api/vendor/orders/page') {
      const stage = filters.find((f) => f.field === 'stage')?.value
      let rows = inDivision.filter((o) => !stage || vendorStageOf(o) === stage)
      const size = Number(config?.params?.size ?? 10)
      if (config?.params?.sort === 'assignedAt' && config.params.dir === 'asc') rows = [...rows].sort((a, b) => (a.assignedAt ?? a.createdAt).localeCompare(b.assignedAt ?? b.createdAt))
      return { data: { data: rows.slice(0, size), total: rows.length, page: 0, pageSize: size, hasMore: rows.length > size } }
    }
    if (url === '/api/vendor/orders/summary') {
      const byStage: Record<string, number> = {}
      for (const order of inDivision) byStage[vendorStageOf(order)] = (byStage[vendorStageOf(order)] ?? 0) + 1
      return { data: { total: inDivision.length, byStage } }
    }
    if (url === '/api/vendor/orders/divisions') {
      const counts = new Map<string, { id: string; name: string; count: number }>()
      for (const o of orders) {
        if (!o.divisionId || !o.divisionName) continue
        const entry = counts.get(o.divisionId) ?? { id: o.divisionId, name: o.divisionName, count: 0 }
        entry.count += 1
        counts.set(o.divisionId, entry)
      }
      return { data: [...counts.values()] }
    }
    return { data: [] }
  }
}
