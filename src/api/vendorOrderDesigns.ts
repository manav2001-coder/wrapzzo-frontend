import type { OrderDesign } from '@/api/orderDesigns'
import { vendorApiClient } from '@/lib/vendorApiClient'

interface PresignDesignResponse {
  uploadUrl: string
  key: string
}

export async function listVendorOrderDesigns(orderId: string): Promise<OrderDesign[]> {
  const { data } = await vendorApiClient.get<OrderDesign[]>(`/api/vendor/orders/${orderId}/designs`)
  return data
}

/** Presigns an upload URL and PUTs the file straight to object storage, then registers the new version. */
export async function uploadVendorOrderDesign(orderId: string, file: File): Promise<OrderDesign> {
  const { data: presign } = await vendorApiClient.post<PresignDesignResponse>(`/api/vendor/orders/${orderId}/designs/presign`, {
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

  const { data } = await vendorApiClient.post<OrderDesign>(`/api/vendor/orders/${orderId}/designs`, {
    key: presign.key,
    fileName: file.name,
  })
  return data
}
