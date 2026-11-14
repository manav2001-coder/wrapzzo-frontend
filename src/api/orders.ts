import { apiClient } from '@/lib/axiosClient'

export type OrderSource = 'CAMPAIGN' | 'QUICK_GIFT' | 'BULK_GIFT'
/** RECEIVED_AT_WAREHOUSE and OUT_FOR_DELIVERY: only an order routed through the company's warehouse (warehouseName set). */
/** A stored photo: where to see it, and the name it downloads as. */
export interface RecipientPhoto {
  url: string
  fileName: string
}

export type OrderApprovalStatus = 'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'REJECTED'

export type OrderStatus =
  | 'PROCESSING'
  | 'PRODUCTION_QUEUE'
  | 'DISPATCHED'
  | 'RECEIVED_AT_WAREHOUSE'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
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
  recipientPcode: string | null
  recipientPhone: string | null
  /** Null until the recipient (or someone on their behalf) uploads one. */
  recipientPhotoUrl: string | null
  /** All of the recipient's photos, first one first (recipientPhotoUrl is the first). */
  recipientPhotos: RecipientPhoto[]
  /** Snapshotted off the gift's total price at approval time -- null if the gift had no price set then. */
  totalPrice: number | null
  quantity: number
  /** The org unit the order was raised from. */
  orgUnitName: string | null
  /** The vendor may not dispatch until a proof is approved. */
  artworkRequired: boolean
  /** The company warehouse this order goes through; null = shipped straight to the recipient. */
  warehouseName: string | null
  source: OrderSource
  status: OrderStatus
  assignedVendorId: string | null
  assignedVendorName: string | null
  assignmentMode: OrderAssignmentMode | null
  assignedAt: string | null
  createdAt: string
  /** Every stage this order has actually passed through, oldest first, each with a real timestamp. */
  history: StageEvent[]
  /** True if an artwork version is sitting in PENDING_REVIEW right now -- drives the "needs design review" indicator. */
  hasPendingDesignReview: boolean
  /** Order approval: PENDING = not with a vendor yet, waiting on the approver; REJECTED = turned down (and cancelled). */
  approvalStatus: OrderApprovalStatus
  /** The approver's note -- always there on a REJECTED order. */
  approvalComment: string | null
  approvalDecidedByName: string | null
}

/** The figures above an Orders list, counted by the server over the same orders -- not from the page on screen. */
export interface OrderSummary {
  total: number
  byStatus: Partial<Record<OrderStatus, number>>
  /** Orders with a proof waiting on a reviewer (company side). */
  awaitingReview: number
  /** Live orders not with a vendor yet and not held for approval (platform side). */
  unassigned: number
}

export async function getOrderSummary(): Promise<OrderSummary> {
  const { data } = await apiClient.get<OrderSummary>('/api/orders/summary')
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

export async function getPlatformOrder(id: string): Promise<Order> {
  const { data } = await apiClient.get<Order>(`/api/platform/orders/${id}`)
  return data
}

export async function getPlatformOrderSummary(companyId: string): Promise<OrderSummary> {
  const { data } = await apiClient.get<OrderSummary>('/api/platform/orders/summary', { params: { companyId } })
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

/** Bulk-assigns a company's Quick Gift orders to a vendor, keyed by companyId. */
export async function assignQuickGiftVendor(companyId: string, vendorId: string): Promise<BulkAssignResult> {
  const { data } = await apiClient.post<BulkAssignResult>(`/api/platform/orders/quickGift/${companyId}/assign`, { vendorId })
  return data
}

export async function autoAssignQuickGiftVendor(companyId: string): Promise<BulkAssignResult> {
  const { data } = await apiClient.post<BulkAssignResult>(`/api/platform/orders/quickGift/${companyId}/autoAssign`)
  return data
}
