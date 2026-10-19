import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { approveOrderDesign, listOrderDesigns, rejectOrderDesign } from '@/api/orderDesigns'

export function useOrderDesigns(orderId: string | undefined) {
  return useQuery({
    queryKey: ['order-designs', orderId],
    queryFn: () => listOrderDesigns(orderId!),
    enabled: Boolean(orderId),
  })
}

export function useApproveOrderDesign(orderId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (designId: string) => approveOrderDesign(orderId, designId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['order-designs', orderId] }),
  })
}

export function useRejectOrderDesign(orderId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ designId, comment }: { designId: string; comment: string }) => rejectOrderDesign(orderId, designId, comment),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['order-designs', orderId] }),
  })
}
