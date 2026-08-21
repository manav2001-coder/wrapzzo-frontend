import { apiClient } from '@/lib/axiosClient'

export interface GiftImage {
  id: string
  imageUrl: string
  displayOrder: number
}

export interface Gift {
  id: string
  displayId: string
  name: string
  category: string
  description: string | null
  moq: number | null
  leadTimeDays: number | null
  active: boolean
  images: GiftImage[]
  createdAt: string
}

export interface GiftInput {
  name: string
  category: string
  description?: string
  moq?: number
  leadTimeDays?: number
}

interface PresignImageUploadResponse {
  uploadUrl: string
  key: string
}

export async function listGifts(): Promise<Gift[]> {
  const { data } = await apiClient.get<Gift[]>('/api/platform/gifts/list')
  return data
}

export async function getGift(id: string): Promise<Gift> {
  const { data } = await apiClient.get<Gift>(`/api/platform/gifts/view/${id}`)
  return data
}

export async function createGift(input: GiftInput): Promise<Gift> {
  const { data } = await apiClient.post<Gift>('/api/platform/gifts/add', input)
  return data
}

export async function updateGift(id: string, input: GiftInput): Promise<Gift> {
  const { data } = await apiClient.post<Gift>(`/api/platform/gifts/edit/${id}`, input)
  return data
}

export async function activateGift(id: string): Promise<Gift> {
  const { data } = await apiClient.post<Gift>(`/api/platform/gifts/activate/${id}`)
  return data
}

export async function deactivateGift(id: string): Promise<Gift> {
  const { data } = await apiClient.post<Gift>(`/api/platform/gifts/deactivate/${id}`)
  return data
}

export async function deleteGiftImage(giftId: string, imageId: string): Promise<Gift> {
  const { data } = await apiClient.delete<Gift>(`/api/platform/gifts/removeImage/${giftId}/${imageId}`)
  return data
}

/** Presigns an upload URL, PUTs the file straight to object storage, then attaches the resulting key to the gift. */
export async function uploadGiftImage(giftId: string, file: File, displayOrder: number): Promise<Gift> {
  const { data: presign } = await apiClient.post<PresignImageUploadResponse>(`/api/platform/gifts/presignImage/${giftId}`, {
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

  const { data } = await apiClient.post<Gift>(`/api/platform/gifts/addImage/${giftId}`, { key: presign.key, displayOrder })
  return data
}
