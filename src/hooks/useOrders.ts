import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  assignCampaignVendor,
  assignOrderVendor,
  assignQuickGiftVendor,
  autoAssignCampaignVendor,
  autoAssignOrderVendor,
  autoAssignQuickGiftVendor,
  getOrder,
  listAllOrdersForPlatform,
  listOrders,
  requestOrderPhotoLink,
  requestPlatformOrderPhotoLink,
} from '@/api/orders'

export function useOrders() {
  return useQuery({ queryKey: ['orders'], queryFn: listOrders })
}

export function useOrder(id: string | undefined) {
  return useQuery({ queryKey: ['orders', id], queryFn: () => getOrder(id!), enabled: Boolean(id) })
}

export function useRequestOrderPhotoLink() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => requestOrderPhotoLink(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  })
}

// --- Admin/platform side ---

export function usePlatformOrders() {
  return useQuery({ queryKey: ['platform-orders'], queryFn: listAllOrdersForPlatform })
}

export function useRequestPlatformOrderPhotoLink() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => requestPlatformOrderPhotoLink(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['platform-orders'] }),
  })
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

export function useAssignCampaignVendor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ campaignId, vendorId }: { campaignId: string; vendorId: string }) => assignCampaignVendor(campaignId, vendorId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['platform-orders'] }),
  })
}

export function useAutoAssignCampaignVendor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (campaignId: string) => autoAssignCampaignVendor(campaignId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['platform-orders'] }),
  })
}

export function useAssignQuickGiftVendor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ companyId, vendorId }: { companyId: string; vendorId: string }) => assignQuickGiftVendor(companyId, vendorId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['platform-orders'] }),
  })
}

export function useAutoAssignQuickGiftVendor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (companyId: string) => autoAssignQuickGiftVendor(companyId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['platform-orders'] }),
  })
}
