import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { approveOrderDesign, listOrderDesigns, listPendingArtworkApprovals, rejectOrderDesign } from '@/api/orderDesigns'
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
    queryClient.invalidateQueries({ queryKey: ['artwork-approvals'] }),
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

/** A manager's queue of MR-approved artwork waiting on their level of approval (empty for anyone else). */
export function usePendingArtworkApprovals(enabled = true) {
  return useQuery({ queryKey: ['artwork-approvals'], queryFn: listPendingArtworkApprovals, refetchInterval: LIVE_REFRESH_MS, enabled })
}

/** Approval at the caller's level, or send-back, from the Approvals queue, where each row names its own order. */
export function useReviewArtwork() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, designId, comment }: { orderId: string; designId: string; comment?: string }) =>
      comment === undefined ? approveOrderDesign(orderId, designId) : rejectOrderDesign(orderId, designId, comment),
    onSuccess: (_design, { orderId }) => afterReview(queryClient, orderId),
  })
}
