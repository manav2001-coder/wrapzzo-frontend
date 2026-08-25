import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { assignOrderVendor, autoAssignOrderVendor, getOrder, listAllOrdersForPlatform, listOrders } from '@/api/orders'

export function useOrders() {
  return useQuery({ queryKey: ['orders'], queryFn: listOrders })
}

export function useOrder(id: string | undefined) {
  return useQuery({ queryKey: ['orders', id], queryFn: () => getOrder(id!), enabled: Boolean(id) })
}

// --- Admin/platform side ---

export function usePlatformOrders() {
  return useQuery({ queryKey: ['platform-orders'], queryFn: listAllOrdersForPlatform })
}

export function useAssignOrderVendor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, vendorId }: { orderId: string; vendorId: string }) => assignOrderVendor(orderId, vendorId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['platform-orders'] }),
  })
}

export function useAutoAssignOrderVendor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (orderId: string) => autoAssignOrderVendor(orderId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['platform-orders'] }),
  })
}
