import { apiClient } from '@/lib/axiosClient'

export type QuickGiftStatus = 'SUBMITTED' | 'APPROVED' | 'REJECTED'

export interface QuickGiftRequest {
  id: string
  displayId: string
  /** Null until approved. */
  orderId: string | null
  orderDisplayId: string | null
  giftId: string
  giftName: string
  giftCategory: string
  requestedByName: string | null
  recipientName: string
  recipientPhone: string
  recipientEmail: string | null
  deliveryAddress: string
  recipientDob: string | null
  giftMessage: string | null
  internalNotes: string | null
  photoUrl: string | null
  photoFileName: string | null
  status: QuickGiftStatus
  rejectionReason: string | null
  reviewedByName: string | null
  reviewedAt: string | null
  createdAt: string
  /** Only set right after an approve() call that just issued a fresh recipient photo-upload link. */
  recipientUploadUrl: string | null
}

export interface QuickGiftPhotoValue {
  key: string
  fileName: string
  contentType: string
}

export interface CreateQuickGiftInput {
  giftId: string
  recipientName: string
  recipientPhone: string
  recipientEmail?: string
  deliveryAddress: string
  recipientDob?: string
  giftMessage?: string
  internalNotes?: string
  photo?: QuickGiftPhotoValue
}

interface PresignPhotoResponse {
  uploadUrl: string
  key: string
}

/** Presigns an upload URL and PUTs the file straight to object storage -- returns the value to submit with the request. */
export async function uploadQuickGiftPhoto(file: File): Promise<QuickGiftPhotoValue> {
  const { data: presign } = await apiClient.post<PresignPhotoResponse>('/api/quick-gifts/presignPhoto', { contentType: file.type })

  const uploadResponse = await fetch(presign.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  })
  if (!uploadResponse.ok) {
    throw new Error(`Upload to storage failed with status ${uploadResponse.status}`)
  }

  return { key: presign.key, fileName: file.name, contentType: file.type }
}

export async function createQuickGiftRequest(input: CreateQuickGiftInput): Promise<QuickGiftRequest> {
  const { data } = await apiClient.post<QuickGiftRequest>('/api/quick-gifts', input)
  return data
}

export async function listMyQuickGiftRequests(): Promise<QuickGiftRequest[]> {
  const { data } = await apiClient.get<QuickGiftRequest[]>('/api/quick-gifts/mine')
  return data
}

export async function getQuickGiftRequest(id: string): Promise<QuickGiftRequest> {
  const { data } = await apiClient.get<QuickGiftRequest>(`/api/quick-gifts/${id}`)
  return data
}

/** Re-sends the recipient's photo-upload link for an already-approved request -- e.g. their first photo wasn't clear enough. */
export async function requestQuickGiftPhotoLink(id: string): Promise<{ recipientUploadUrl: string }> {
  const { data } = await apiClient.post<{ recipientUploadUrl: string }>(`/api/quick-gifts/${id}/requestPhotoLink`)
  return data
}

// --- Approval (Company Admin) ---

export async function listPendingQuickGiftApprovals(): Promise<QuickGiftRequest[]> {
  const { data } = await apiClient.get<QuickGiftRequest[]>('/api/quick-gifts/pending-approval')
  return data
}

export async function approveQuickGiftRequest(id: string): Promise<QuickGiftRequest> {
  const { data } = await apiClient.post<QuickGiftRequest>(`/api/quick-gifts/${id}/approve`)
  return data
}

export async function rejectQuickGiftRequest(id: string, reason: string): Promise<QuickGiftRequest> {
  const { data } = await apiClient.post<QuickGiftRequest>(`/api/quick-gifts/${id}/reject`, { reason })
  return data
}
