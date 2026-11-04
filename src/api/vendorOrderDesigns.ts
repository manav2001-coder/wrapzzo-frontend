import type { OrderDesign } from '@/api/orderDesigns'
import { vendorApiClient } from '@/lib/vendorApiClient'

interface PresignDesignResponse {
  uploadUrl: string
  key: string
  /** What the proof will be called: PCODE_AMCODE_vN.pdf. */
  fileName: string
}

const PDF = 'application/pdf'

export async function listVendorOrderDesigns(orderId: string): Promise<OrderDesign[]> {
  const { data } = await vendorApiClient.get<OrderDesign[]>(`/api/vendor/orders/${orderId}/designs`)
  return data
}

/**
 * Presigns an upload URL and PUTs the file straight to object storage, then registers the new version. Proofs are
 * PDFs, and the server names them (PCODE_AMCODE_vN.pdf): the file's own name is not used.
 */
export async function uploadVendorOrderDesign(orderId: string, file: File): Promise<OrderDesign> {
  if (file.type !== PDF) throw new Error('Only PDF files can be uploaded.')
  const { data: presign } = await vendorApiClient.post<PresignDesignResponse>(`/api/vendor/orders/${orderId}/designs/presign`, {
    contentType: PDF,
  })

  const uploadResponse = await fetch(presign.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': PDF },
    body: file,
  })
  if (!uploadResponse.ok) {
    throw new Error(`Upload to storage failed with status ${uploadResponse.status}`)
  }

  const { data } = await vendorApiClient.post<OrderDesign>(`/api/vendor/orders/${orderId}/designs`, {
    key: presign.key,
  })
  return data
}
