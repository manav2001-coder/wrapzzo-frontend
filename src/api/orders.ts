import { apiClient } from '@/lib/axiosClient'

export type OrderSource = 'CAMPAIGN' | 'QUICK_GIFT' | 'BULK_GIFT'
export type OrderStatus = 'PROCESSING' | 'PRODUCTION_QUEUE' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED'
export type OrderAssignmentMode = 'AUTO' | 'MANUAL'

export interface StageEvent {
  status: OrderStatus
  at: string
  /** Null for a vendor-driven change -- vendors aren't Users, so there's no name to show. */
  changedByName: string | null
}

export interface Order {
  id: string
  displayId: string
  companyId: string
  companyName: string
  /** Null for a Quick Gift order (source !== 'CAMPAIGN'). */
  campaignId: string | null
  campaignName: string | null
  submissionId: string | null
  giftId: string | null
  giftName: string | null
  /** The gift's first catalogue image, if it has one -- same lookup as the Dashboard's order timeline chips. */
  giftImageUrl: string | null
  recipientName: string | null
  recipientPhone: string | null
  /** Null until the recipient (or someone on their behalf) uploads one. */
  recipientPhotoUrl: string | null
  /** Snapshotted off the gift's total price at approval time -- null if the gift had no price set then. */
  totalPrice: number | null
  source: OrderSource
  status: OrderStatus
  assignedVendorId: string | null
  assignedVendorName: string | null
  assignmentMode: OrderAssignmentMode | null
  assignedAt: string | null
  createdAt: string
  /** Every stage this order has actually passed through, oldest first, each with a real timestamp. */
  history: StageEvent[]
}

export async function listOrders(): Promise<Order[]> {
  const { data } = await apiClient.get<Order[]>('/api/orders')
  return data
}

export async function getOrder(id: string): Promise<Order> {
  const { data } = await apiClient.get<Order>(`/api/orders/${id}`)
  return data
}

/** Re-sends the recipient's photo-upload link for this order -- available to anyone who can already see it, since there's no separate approval step left to gate it on. */
export async function requestOrderPhotoLink(id: string): Promise<{ recipientUploadUrl: string }> {
  const { data } = await apiClient.post<{ recipientUploadUrl: string }>(`/api/orders/${id}/requestPhotoLink`)
  return data
}

// --- Admin/platform side: every company's orders, for fulfillment assignment. ---

export async function listAllOrdersForPlatform(): Promise<Order[]> {
  const { data } = await apiClient.get<Order[]>('/api/platform/orders')
  return data
}

export async function requestPlatformOrderPhotoLink(id: string): Promise<{ recipientUploadUrl: string }> {
  const { data } = await apiClient.post<{ recipientUploadUrl: string }>(`/api/platform/orders/${id}/requestPhotoLink`)
  return data
}

export async function assignOrderVendor(orderId: string, vendorId: string): Promise<Order> {
  const { data } = await apiClient.post<Order>(`/api/platform/orders/${orderId}/assign`, { vendorId })
  return data
}

export async function autoAssignOrderVendor(orderId: string): Promise<Order> {
  const { data } = await apiClient.post<Order>(`/api/platform/orders/${orderId}/autoAssign`)
  return data
}

export interface BulkAssignResult {
  assignedCount: number
  skippedCount: number
  orders: Order[]
}

export async function assignCampaignVendor(campaignId: string, vendorId: string): Promise<BulkAssignResult> {
  const { data } = await apiClient.post<BulkAssignResult>(`/api/platform/orders/campaign/${campaignId}/assign`, { vendorId })
  return data
}

export async function autoAssignCampaignVendor(campaignId: string): Promise<BulkAssignResult> {
  const { data } = await apiClient.post<BulkAssignResult>(`/api/platform/orders/campaign/${campaignId}/autoAssign`)
  return data
}

/** Same bulk-assign convenience as a campaign's, but for a company's Quick Gift orders -- keyed by companyId since there's no campaign to key off. */
export async function assignQuickGiftVendor(companyId: string, vendorId: string): Promise<BulkAssignResult> {
  const { data } = await apiClient.post<BulkAssignResult>(`/api/platform/orders/quickGift/${companyId}/assign`, { vendorId })
  return data
}

export async function autoAssignQuickGiftVendor(companyId: string): Promise<BulkAssignResult> {
  const { data } = await apiClient.post<BulkAssignResult>(`/api/platform/orders/quickGift/${companyId}/autoAssign`)
  return data
}
