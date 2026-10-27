import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { approveOrderDesign, listOrderDesigns, rejectOrderDesign } from '@/api/orderDesigns'
import { LIVE_REFRESH_MS } from '@/lib/live-refresh'

export function useOrderDesigns(orderId: string | undefined) {
  return useQuery({
    queryKey: ['order-designs', orderId],
    queryFn: () => listOrderDesigns(orderId!),
    enabled: Boolean(orderId),
    // The vendor's next proof arrives without the reviewer doing anything.
    refetchInterval: LIVE_REFRESH_MS,
  })
}

/** A review changes the order too ("waiting on review" clears) -- refresh the orders, not just the proofs. */
function afterReview(queryClient: QueryClient, orderId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['order-designs', orderId] }),
    queryClient.invalidateQueries({ queryKey: ['orders'] }),
  ])
}

export function useApproveOrderDesign(orderId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (designId: string) => approveOrderDesign(orderId, designId),
    onSuccess: () => afterReview(queryClient, orderId),
  })
}

export function useRejectOrderDesign(orderId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ designId, comment }: { designId: string; comment: string }) => rejectOrderDesign(orderId, designId, comment),
    onSuccess: () => afterReview(queryClient, orderId),
  })
}
