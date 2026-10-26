import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listVendorOrderDesigns, uploadVendorOrderDesign } from '@/api/vendorOrderDesigns'
import { vendorOrdersKey } from '@/hooks/useVendorOrders'

export function useVendorOrderDesigns(orderId: string | undefined) {
  return useQuery({
    queryKey: ['vendor-order-designs', orderId],
    queryFn: () => listVendorOrderDesigns(orderId!),
    enabled: Boolean(orderId),
  })
}

export function useUploadVendorOrderDesign(orderId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => uploadVendorOrderDesign(orderId, file),
    // A new proof moves the order to "in review" -- refresh the order views too, not just the history.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['vendor-order-designs', orderId] }),
        queryClient.invalidateQueries({ queryKey: vendorOrdersKey }),
      ]),
  })
}
