import { apiClient } from '@/lib/axiosClient'

export type OrderDesignStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'

export interface OrderDesign {
  id: string
  orderId: string
  versionNo: number
  fileUrl: string
  fileName: string | null
  status: OrderDesignStatus
  uploadedByVendorName: string
  reviewedByUserName: string | null
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
