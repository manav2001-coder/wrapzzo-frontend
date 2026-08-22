import type { Gift, GiftInput } from '@/api/gifts'
import { vendorApiClient } from '@/lib/vendorApiClient'

interface PresignImageUploadResponse {
  uploadUrl: string
  key: string
}

/** A vendor's own gift submissions -- scoped server-side to the calling vendor throughout. */
export async function listVendorGifts(): Promise<Gift[]> {
  const { data } = await vendorApiClient.get<Gift[]>('/api/vendor/gifts/list')
  return data
}

export async function getVendorGift(id: string): Promise<Gift> {
  const { data } = await vendorApiClient.get<Gift>(`/api/vendor/gifts/view/${id}`)
  return data
}

export async function createVendorGift(input: GiftInput): Promise<Gift> {
  const { data } = await vendorApiClient.post<Gift>('/api/vendor/gifts/add', input)
  return data
}

export async function updateVendorGift(id: string, input: GiftInput): Promise<Gift> {
  const { data } = await vendorApiClient.post<Gift>(`/api/vendor/gifts/edit/${id}`, input)
  return data
}

export async function deleteVendorGiftImage(giftId: string, imageId: string): Promise<Gift> {
  const { data } = await vendorApiClient.delete<Gift>(`/api/vendor/gifts/removeImage/${giftId}/${imageId}`)
  return data
}

/** Presigns an upload URL, PUTs the file straight to object storage, then attaches the resulting key to the gift. */
export async function uploadVendorGiftImage(giftId: string, file: File, displayOrder: number): Promise<Gift> {
  const { data: presign } = await vendorApiClient.post<PresignImageUploadResponse>(`/api/vendor/gifts/presignImage/${giftId}`, {
    contentType: file.type,
  })

  const uploadResponse = await fetch(presign.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  })
  if (!uploadResponse.ok) {
    throw new Error(`Upload to storage failed with status ${uploadResponse.status}`)
  }

  const { data } = await vendorApiClient.post<Gift>(`/api/vendor/gifts/addImage/${giftId}`, { key: presign.key, displayOrder })
  return data
}
