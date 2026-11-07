import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { OrderStatus } from '@/api/orders'
import { getMyVendorProfile, getVendorOrder, getVendorOrderSummary, listMyVendorDivisions, listVendorOrderDivisions, updateVendorOrderStatus, type VendorOrder } from '@/api/vendorOrders'
import { LIVE_REFRESH_MS } from '@/lib/live-refresh'
import type { ListFilter } from '@/lib/list-filter'
import { fetchPage } from '@/lib/server-list'
import { ALL_DIVISIONS, useVendorDivision } from '@/lib/vendor-division'
import { ACTION_STAGES, type VendorStage } from '@/lib/vendor-order-stage'
import { vendorApiClient } from '@/lib/vendorApiClient'

/** Exported so a proof upload can refresh the orders it changes the artwork state of. */
export const vendorOrdersKey = ['vendorOrders'] as const
const vendorOrderKey = (id: string) => ['vendorOrders', id] as const

// These poll: the customer's artwork decision lands on the vendor's screen without a reload. The orders list itself is a paged
// DataTable (serverFetcher); what lives here is the figures above it and what the home page lists.

/** The vendor's order counts by stage, narrowed to the division picked in the portal's division filter (all of them when none is). */
export function useVendorOrderSummary() {
  const division = useVendorDivision()
  return useQuery({
    queryKey: [...vendorOrdersKey, 'summary', division],
    queryFn: () => getVendorOrderSummary(division === ALL_DIVISIONS ? undefined : division),
    refetchInterval: LIVE_REFRESH_MS,
  })
}

/** The divisions the vendor's orders come from, whatever the division filter says -- what the filter itself is built from. */
export function useVendorOrderDivisions() {
  return useQuery({ queryKey: [...vendorOrdersKey, 'divisions'], queryFn: listVendorOrderDivisions, refetchInterval: LIVE_REFRESH_MS })
}

/** The filter the picked division adds to a list of the vendor's orders. */
export function divisionFilter(division: string): ListFilter[] {
  return division === ALL_DIVISIONS ? [] : [{ field: 'divisionId', operator: 'equals', value: division }]
}

export const VENDOR_ORDERS_PATH = '/api/vendor/orders/page'

/**
 * The orders that need the vendor's hand next, most urgent stage first and oldest first within it -- a handful, not the queue: it reads
 * the first few of each action stage that has any, until there are enough.
 */
export function useVendorActionOrders(limit = 6) {
  const division = useVendorDivision()
  const { data: summary } = useVendorOrderSummary()
  return useQuery({
    queryKey: [...vendorOrdersKey, 'actions', division, summary?.byStage ?? null],
    enabled: summary !== undefined,
    queryFn: async () => {
      const found: { order: VendorOrder; stage: VendorStage }[] = []
      for (const stage of ACTION_STAGES) {
        if (found.length >= limit) break
        if (!summary?.byStage[stage]) continue
        const page = await fetchPage<VendorOrder>(
          VENDOR_ORDERS_PATH,
          { pageIndex: 0, pageSize: limit - found.length, sort: 'assignedAt', sortDir: 'asc', filters: [] },
          [{ field: 'stage', operator: 'equals', value: stage }, ...divisionFilter(division)],
          {},
          vendorApiClient,
        )
        found.push(...page.data.map((order) => ({ order, stage })))
      }
      return found
    },
  })
}

export function useVendorOrder(id: string | undefined) {
  return useQuery({
    queryKey: vendorOrderKey(id ?? ''),
    queryFn: () => getVendorOrder(id!),
    enabled: Boolean(id),
    refetchInterval: LIVE_REFRESH_MS,
  })
}

/** The divisions the vendor is mapped to serve -- offered by the portal's division filter even before an order comes from one. */
export function useMyVendorDivisions() {
  return useQuery({ queryKey: ['vendorDivisions'], queryFn: listMyVendorDivisions, staleTime: 5 * 60_000 })
}

export function useMyVendorProfile() {
  return useQuery({ queryKey: ['vendorProfile'], queryFn: getMyVendorProfile, staleTime: 5 * 60_000 })
}

export function useUpdateVendorOrderStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) => updateVendorOrderStatus(id, status),
    onSuccess: (data) => {
      queryClient.setQueryData(vendorOrderKey(data.id), data)
      queryClient.invalidateQueries({ queryKey: vendorOrdersKey })
      queryClient.invalidateQueries({ queryKey: ['table-data'] })
    },
  })
}
