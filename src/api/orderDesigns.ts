import { apiClient } from '@/lib/axiosClient'

/** PENDING_FINAL_APPROVAL: the MR approved it and, with senior artwork approval on, it waits for their manager. */
export type OrderDesignStatus = 'PENDING_REVIEW' | 'PENDING_FINAL_APPROVAL' | 'APPROVED' | 'REJECTED'

export interface OrderDesign {
  id: string
  orderId: string
  versionNo: number
  fileUrl: string
  fileName: string | null
  status: OrderDesignStatus
  uploadedByVendorName: string
  reviewedByUserName: string | null
  /** The MR's approval, when the proof then went to their manager for the final one. */
  firstApprovedByUserName: string | null
  firstApprovedAt: string | null
  reviewComment: string | null
  reviewedAt: string | null
  createdAt: string
}

export async function listOrderDesigns(orderId: string): Promise<OrderDesign[]> {
  const { data } = await apiClient.get<OrderDesign[]>(`/api/orders/${orderId}/designs`)
  return data
}

export async function approveOrderDesign(orderId: string, designId: string): Promise<OrderDesign> {
  const { data } = await apiClient.post<OrderDesign>(`/api/orders/${orderId}/designs/${designId}/approve`)
  return data
}

export async function rejectOrderDesign(orderId: string, designId: string, comment: string): Promise<OrderDesign> {
  const { data } = await apiClient.post<OrderDesign>(`/api/orders/${orderId}/designs/${designId}/reject`, { comment })
  return data
}

/** An MR-approved proof waiting for a senior's final approval -- a row of their Approvals queue. */
export interface PendingArtworkApproval {
  designId: string
  orderId: string
  orderDisplayId: string
  giftName: string | null
  recipientName: string | null
  quantity: number
  requestedByName: string | null
  versionNo: number
  fileUrl: string
  fileName: string | null
  vendorName: string
  mrApprovedByName: string | null
  mrApprovedAt: string | null
}

export async function listPendingArtworkApprovals(): Promise<PendingArtworkApproval[]> {
  const { data } = await apiClient.get<PendingArtworkApproval[]>('/api/artwork-approvals/pending')
  return data
}
