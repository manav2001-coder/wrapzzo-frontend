import { authGet, authPost, authDelete } from './client'

export interface GiftImage {
  id: string
  imageUrl: string
  displayOrder: number
}

export interface Gift {
  id: string
  name: string
  category: string
  description: string | null
  moq: number | null
  leadTimeDays: number | null
  active: boolean
  images: GiftImage[]
  createdAt: string
}

export interface CreateGiftInput {
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

export function listGifts(token: string): Promise<Gift[]> {
  return authGet<Gift[]>('/api/platform/gifts/list', token)
}

export function getGift(token: string, id: string): Promise<Gift> {
  return authGet<Gift>(`/api/platform/gifts/view/${id}`, token)
}

export function createGift(token: string, input: CreateGiftInput): Promise<Gift> {
  return authPost<Gift>('/api/platform/gifts/add', token, input)
}

export function updateGift(token: string, id: string, input: CreateGiftInput): Promise<Gift> {
  return authPost<Gift>(`/api/platform/gifts/edit/${id}`, token, input)
}

export function activateGift(token: string, id: string): Promise<Gift> {
  return authPost<Gift>(`/api/platform/gifts/activate/${id}`, token)
}

export function deactivateGift(token: string, id: string): Promise<Gift> {
  return authPost<Gift>(`/api/platform/gifts/deactivate/${id}`, token)
}

export function deleteGiftImage(token: string, giftId: string, imageId: string): Promise<Gift> {
  return authDelete<Gift>(`/api/platform/gifts/removeImage/${giftId}/${imageId}`, token)
}

/** Presigns an upload URL, PUTs the file straight to S3/MinIO, then attaches the resulting key to the gift. */
export async function uploadGiftImage(token: string, giftId: string, file: File): Promise<Gift> {
  const { uploadUrl, key } = await authPost<PresignImageUploadResponse>(`/api/platform/gifts/presignImage/${giftId}`, token, {
    contentType: file.type,
  })

  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  })
  if (!uploadResponse.ok) {
    throw new Error(`Upload to storage failed with status ${uploadResponse.status}`)
  }

  return authPost<Gift>(`/api/platform/gifts/addImage/${giftId}`, token, { key })
}
