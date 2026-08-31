import { apiClient } from '@/lib/axiosClient'

export type OrderSource = 'CAMPAIGN' | 'QUICK_GIFT' | 'BULK_GIFT'
export type OrderStatus = 'PROCESSING' | 'PRODUCTION_QUEUE' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED'
export type OrderAssignmentMode = 'AUTO' | 'MANUAL'

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
  recipientName: string | null
  recipientPhone: string | null
  source: OrderSource
  status: OrderStatus
  assignedVendorId: string | null
  assignedVendorName: string | null
  assignmentMode: OrderAssignmentMode | null
  assignedAt: string | null
  createdAt: string
}

export async function listOrders(): Promise<Order[]> {
  const { data } = await apiClient.get<Order[]>('/api/orders')
  return data
}

export async function getOrder(id: string): Promise<Order> {
  const { data } = await apiClient.get<Order>(`/api/orders/${id}`)
  return data
}

// --- Admin/platform side: every company's orders, for fulfillment assignment. ---

export async function listAllOrdersForPlatform(): Promise<Order[]> {
  const { data } = await apiClient.get<Order[]>('/api/platform/orders')
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
