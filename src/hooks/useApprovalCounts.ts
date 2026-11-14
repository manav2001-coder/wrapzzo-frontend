import { useQuery } from '@tanstack/react-query'

import { LIVE_REFRESH_MS } from '@/lib/live-refresh'
import type { PendingArtworkApproval } from '@/api/orderDesigns'
import { countOf, fetchPage } from '@/lib/server-list'

/** How many artwork proofs and order requests wait on the caller -- the tab badges. Read as a page of one: the server counts. */
export function useApprovalCounts() {
  const artwork = useQuery({ queryKey: ['approvals', 'count', 'artwork'], queryFn: () => countOf('/api/artwork-approvals/pending/page'), refetchInterval: LIVE_REFRESH_MS })
  const orders = useQuery({ queryKey: ['approvals', 'count', 'orders'], queryFn: () => countOf('/api/order-approvals/pending/page'), refetchInterval: LIVE_REFRESH_MS })
  return { artwork: artwork.data, orders: orders.data }
}

/** The dashboard's "proofs to review" tile: how many wait, and which is next -- the first page of one, not the queue. */
export function usePendingArtworkPreview(enabled: boolean) {
  return useQuery({
    queryKey: ['approvals', 'preview', 'artwork'],
    enabled,
    refetchInterval: LIVE_REFRESH_MS,
    queryFn: async () => {
      const page = await fetchPage<PendingArtworkApproval>('/api/artwork-approvals/pending/page', { pageIndex: 0, pageSize: 1, filters: [] })
      return { count: page.total, next: page.data[0] ?? null }
    },
  })
}

/** How many order requests wait on the caller to approve -- the dashboard's "requests to approve" tile. */
export function usePendingOrderApprovalCount(enabled: boolean) {
  return useQuery({ queryKey: ['approvals', 'count', 'orders', 'dashboard'], enabled, refetchInterval: LIVE_REFRESH_MS, queryFn: () => countOf('/api/order-approvals/pending/page') })
}
