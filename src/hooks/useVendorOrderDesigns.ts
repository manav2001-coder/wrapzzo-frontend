import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listVendorOrderDesigns, uploadVendorOrderDesign } from '@/api/vendorOrderDesigns'

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vendor-order-designs', orderId] }),
  })
}
