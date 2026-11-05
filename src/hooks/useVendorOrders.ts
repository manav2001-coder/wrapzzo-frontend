import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { OrderStatus } from '@/api/orders'
import { getMyVendorProfile, getVendorOrder, listVendorOrders, updateVendorOrderStatus } from '@/api/vendorOrders'
import { LIVE_REFRESH_MS } from '@/lib/live-refresh'
import { inDivision, useVendorDivision } from '@/lib/vendor-division'

/** Exported so a proof upload can refresh the orders it changes the artwork state of. */
export const vendorOrdersKey = ['vendorOrders'] as const
const vendorOrderKey = (id: string) => ['vendorOrders', id] as const

// Both poll: the customer's artwork decision lands on the vendor's screen without a reload.
/** The vendor's orders, narrowed to the division picked in the portal's division filter (all of them when none is). */
export function useVendorOrders() {
  const division = useVendorDivision()
  return useQuery({
    queryKey: vendorOrdersKey,
    queryFn: listVendorOrders,
    refetchInterval: LIVE_REFRESH_MS,
    select: (orders) => inDivision(orders, division),
  })
}

/** Every order whatever the division filter says -- what the filter itself is built from. */
export function useAllVendorOrders() {
  return useQuery({ queryKey: vendorOrdersKey, queryFn: listVendorOrders, refetchInterval: LIVE_REFRESH_MS })
}

export function useVendorOrder(id: string | undefined) {
  return useQuery({
    queryKey: vendorOrderKey(id ?? ''),
    queryFn: () => getVendorOrder(id!),
    enabled: Boolean(id),
    refetchInterval: LIVE_REFRESH_MS,
  })
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
    },
  })
}
