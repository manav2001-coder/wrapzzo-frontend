import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { OrderStatus } from '@/api/orders'
import { getMyVendorProfile, getVendorOrder, listVendorOrders, updateVendorOrderStatus } from '@/api/vendorOrders'

/** Exported so a proof upload can refresh the orders it changes the artwork state of. */
export const vendorOrdersKey = ['vendorOrders'] as const
const vendorOrderKey = (id: string) => ['vendorOrders', id] as const

export function useVendorOrders() {
  return useQuery({ queryKey: vendorOrdersKey, queryFn: listVendorOrders })
}

export function useVendorOrder(id: string | undefined) {
  return useQuery({ queryKey: vendorOrderKey(id ?? ''), queryFn: () => getVendorOrder(id!), enabled: Boolean(id) })
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
