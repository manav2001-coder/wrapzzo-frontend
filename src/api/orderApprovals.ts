import { apiClient } from '@/lib/axiosClient'
import type { ArtworkApprovalScope } from '@/api/artworkApproval'
import type { RecipientPhoto } from '@/api/orders'

/** An order waiting on the caller's yes. The vendor is never named here. */
export interface PendingOrderApproval {
  orderId: string
  displayId: string
  giftName: string | null
  recipientName: string | null
  recipientPcode: string | null
  quantity: number
  totalPrice: number | null
  requestedByName: string
  orgUnitName: string | null
  giftMessage: string | null
  internalNotes: string | null
  /** The photos the field person attached, for the approver to judge before deciding. Empty when there are none. */
  recipientPhotos: RecipientPhoto[]
  requestedAt: string
}

export async function approveOrder(orderId: string, comment?: string): Promise<PendingOrderApproval> {
  const { data } = await apiClient.post<PendingOrderApproval>(`/api/order-approvals/${orderId}/approve`, { comment: comment || null })
  return data
}

/** The note is required: the person who placed the order sees it. */
export async function rejectOrder(orderId: string, comment: string): Promise<PendingOrderApproval> {
  const { data } = await apiClient.post<PendingOrderApproval>(`/api/order-approvals/${orderId}/reject`, { comment })
  return data
}

export interface OrderApprovalSettings {
  enabled: boolean
  roleId: string | null
  roleName: string | null
  scope: ArtworkApprovalScope
  /** The company's active roles, for the approver picker. */
  roles: { id: string; name: string }[]
}

export async function getOrderApprovalSettings(): Promise<OrderApprovalSettings> {
  const { data } = await apiClient.get<OrderApprovalSettings>('/api/order-approvals/settings')
  return data
}

export async function setOrderApprovalSettings(settings: { enabled: boolean; roleId: string | null; scope: ArtworkApprovalScope }): Promise<OrderApprovalSettings> {
  const { data } = await apiClient.put<OrderApprovalSettings>('/api/order-approvals/settings', settings)
  return data
}
