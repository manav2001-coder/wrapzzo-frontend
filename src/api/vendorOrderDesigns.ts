import type { OrderDesign } from '@/api/orderDesigns'
import { UserFacingError } from '@/lib/user-facing-error'
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
  // Some systems report no type for a .pdf, so the extension counts too.
  const isPdf = file.type === PDF || (file.type === '' && /\.pdf$/i.test(file.name))
  if (!isPdf) throw new UserFacingError(`"${file.name}" is not a PDF. Proofs must be PDF files.`)
  const { data: presign } = await vendorApiClient.post<PresignDesignResponse>(`/api/vendor/orders/${orderId}/designs/presign`, {
    contentType: PDF,
  })

  let uploadResponse: Response
  try {
    uploadResponse = await fetch(presign.uploadUrl, { method: 'PUT', headers: { 'Content-Type': PDF }, body: file })
  } catch {
    throw new UserFacingError(`"${file.name}" could not be sent to file storage -- check your connection and try again.`)
  }
  if (!uploadResponse.ok) {
    throw new UserFacingError(`File storage refused "${file.name}" (status ${uploadResponse.status}). Please try again, and tell us if it keeps happening.`)
  }

  const { data } = await vendorApiClient.post<OrderDesign>(`/api/vendor/orders/${orderId}/designs`, {
    key: presign.key,
  })
  return data
}
