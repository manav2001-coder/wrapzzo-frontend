import { apiClient } from '@/lib/axiosClient'

/** PENDING_FINAL_APPROVAL: the MR approved it and, with senior artwork approval on, it climbs their reporting line one manager per level. */
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
  /** While PENDING_FINAL_APPROVAL: the level it waits on (1 = the MR's manager), of how many. */
  approvalLevel: number | null
  approvalLevels: number | null
  /** The manager the current level waits on; null when no one is above the MR. Empty for the vendor. */
  waitingOnName: string | null
  /** Every decision on this proof, oldest first (level 0 is the MR's review). Empty for the vendor. */
  approvals: ArtworkApprovalStep[]
  createdAt: string
}

export interface ArtworkApprovalStep {
  level: number
  decision: 'APPROVED' | 'REJECTED'
  decidedByName: string
  /** Set when someone with Final Artwork Approval signed this level for the manager it was waiting on. */
  onBehalfOfName: string | null
  comment: string | null
  decidedAt: string
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

/** An MR-approved proof waiting on the caller's level of approval -- a row of their Approvals queue. */
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
  approvalLevel: number
  approvalLevels: number
  /** The manager this level waits on; null when no one is above the MR. */
  waitingOnName: string | null
  /** True when the caller isn't that manager and signs as cover (Final Artwork Approval). */
  covering: boolean
  approvals: ArtworkApprovalStep[]
}

export async function listPendingArtworkApprovals(): Promise<PendingArtworkApproval[]> {
  const { data } = await apiClient.get<PendingArtworkApproval[]>('/api/artwork-approvals/pending')
  return data
}
