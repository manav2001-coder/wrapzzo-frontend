import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { OrderStatus } from '@/api/orders'
import { getVendorOrder, listVendorOrders, updateVendorOrderStatus } from '@/api/vendorOrders'

const vendorOrdersKey = ['vendorOrders'] as const
const vendorOrderKey = (id: string) => ['vendorOrders', id] as const

export function useVendorOrders() {
  return useQuery({ queryKey: vendorOrdersKey, queryFn: listVendorOrders })
}

export function useVendorOrder(id: string | undefined) {
  return useQuery({ queryKey: vendorOrderKey(id ?? ''), queryFn: () => getVendorOrder(id!), enabled: Boolean(id) })
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
