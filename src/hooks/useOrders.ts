import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  assignCampaignVendor,
  assignOrderVendor,
  assignQuickGiftVendor,
  autoAssignCampaignVendor,
  autoAssignOrderVendor,
  autoAssignQuickGiftVendor,
  getOrder,
  getOrderSummary,
  getPlatformOrder,
  getPlatformOrderSummary,
  requestOrderPhotoLink,
  requestPlatformOrderPhotoLink,
} from '@/api/orders'
import { invalidateOrderLists } from '@/lib/invalidate-lists'
import { LIVE_REFRESH_MS } from '@/lib/live-refresh'

// These poll: a vendor's new proof or status change shows on the company side without a reload. The list itself is a paged
// DataTable (serverFetcher); what lives here is the one open order and the figures above the list.
export function useOrderSummary() {
  return useQuery({ queryKey: ['orders', 'summary'], queryFn: getOrderSummary, refetchInterval: LIVE_REFRESH_MS })
}

export function useOrder(id: string | undefined) {
  return useQuery({ queryKey: ['orders', 'detail', id], queryFn: () => getOrder(id!), enabled: Boolean(id), refetchInterval: LIVE_REFRESH_MS })
}

export function useRequestOrderPhotoLink() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => requestOrderPhotoLink(id),
    onSuccess: () => invalidateOrderLists(queryClient),
  })
}

// --- Admin/platform side ---

export function usePlatformOrder(id: string | undefined) {
  return useQuery({ queryKey: ['platform-orders', 'detail', id], queryFn: () => getPlatformOrder(id!), enabled: Boolean(id) })
}

export function usePlatformOrderSummary(companyId: string | undefined) {
  return useQuery({ queryKey: ['platform-orders', 'summary', companyId], queryFn: () => getPlatformOrderSummary(companyId!), enabled: Boolean(companyId) })
}

export function useRequestPlatformOrderPhotoLink() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => requestPlatformOrderPhotoLink(id),
    onSuccess: () => invalidateOrderLists(queryClient),
  })
}

export function useAssignOrderVendor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, vendorId }: { orderId: string; vendorId: string }) => assignOrderVendor(orderId, vendorId),
    onSuccess: () => invalidateOrderLists(queryClient),
  })
}

export function useAutoAssignOrderVendor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (orderId: string) => autoAssignOrderVendor(orderId),
    onSuccess: () => invalidateOrderLists(queryClient),
  })
}

export function useAssignCampaignVendor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ campaignId, vendorId }: { campaignId: string; vendorId: string }) => assignCampaignVendor(campaignId, vendorId),
    onSuccess: () => invalidateOrderLists(queryClient),
  })
}

export function useAutoAssignCampaignVendor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (campaignId: string) => autoAssignCampaignVendor(campaignId),
    onSuccess: () => invalidateOrderLists(queryClient),
  })
}

export function useAssignQuickGiftVendor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ companyId, vendorId }: { companyId: string; vendorId: string }) => assignQuickGiftVendor(companyId, vendorId),
    onSuccess: () => invalidateOrderLists(queryClient),
  })
}

export function useAutoAssignQuickGiftVendor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (companyId: string) => autoAssignQuickGiftVendor(companyId),
    onSuccess: () => invalidateOrderLists(queryClient),
  })
}
