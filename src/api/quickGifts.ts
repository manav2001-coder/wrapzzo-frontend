import type { DoctorDetails } from '@/api/recipients'
import type { OrderApprovalStatus, RecipientPhoto } from '@/api/orders'
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
  /** The doctor's pcode when ordered. */
  recipientPcode: string | null
  recipientEmail: string | null
  /** Not asked for any more; null on new orders. */
  deliveryAddress: string | null
  doctor: DoctorDetails
  quantity: number
  orgUnitName: string | null
  giftMessage: string | null
  internalNotes: string | null
  /** The first photo, for screens that show one; `photos` has them all. */
  photoUrl: string | null
  photoFileName: string | null
  photos: RecipientPhoto[]
  status: QuickGiftStatus
  rejectionReason: string | null
  reviewedByName: string | null
  reviewedAt: string | null
  createdAt: string
  /** Only set right after an approve() call that just issued a fresh recipient photo-upload link. */
  recipientUploadUrl: string | null
  /** PENDING = the order is held for its approver and has not gone to production; null before an order exists. */
  orderApprovalStatus: OrderApprovalStatus | null
}

export interface QuickGiftPhotoValue {
  key: string
  fileName: string
  contentType: string
}

export interface CreateQuickGiftInput {
  giftId: string
  /** A directory doctor -- the server then takes their details from the record, not the fields below. */
  recipientId?: string
  recipientName: string
  recipientPhone: string
  /** A new doctor's pcode -- required when no existing doctor (recipientId) was picked. */
  recipientPcode?: string
  recipientEmail?: string
  deliveryAddress?: string
  giftMessage?: string
  internalNotes?: string
  /** Up to 10, each already uploaded with uploadQuickGiftPhoto. */
  photos?: QuickGiftPhotoValue[]
  /** Print details for a new doctor -- ignored server-side when an existing one (recipientId) was picked. */
  doctor?: Partial<DoctorDetails>
  /** Units to order; omitted means 1. */
  quantity?: number
}

interface PresignPhotoResponse {
  uploadUrl: string
  key: string
  /** What the server stores the file as -- PCODE_AMCODE_photo.ext. */
  fileName: string
}

/** Presigns an upload URL and PUTs the file straight to object storage -- returns the value to submit with the request. */
export async function uploadQuickGiftPhoto(file: File, pcode?: string, number = 1): Promise<QuickGiftPhotoValue> {
  // The doctor's pcode lets the server name the stored file after them (and the AM), like a proof; `number` keeps several photos of one order apart.
  const { data: presign } = await apiClient.post<PresignPhotoResponse>('/api/quick-gifts/presignPhoto', { contentType: file.type, pcode, number })

  const uploadResponse = await fetch(presign.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  })
  if (!uploadResponse.ok) {
    throw new Error(`Upload to storage failed with status ${uploadResponse.status}`)
  }

  return { key: presign.key, fileName: presign.fileName, contentType: file.type }
}

export async function createQuickGiftRequest(input: CreateQuickGiftInput): Promise<QuickGiftRequest> {
  const { data } = await apiClient.post<QuickGiftRequest>('/api/quick-gifts', input)
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
