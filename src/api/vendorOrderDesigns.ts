import type { OrderDesign } from '@/api/orderDesigns'
import { UserFacingError } from '@/lib/user-facing-error'
import { vendorApiClient } from '@/lib/vendorApiClient'

interface PresignDesignResponse {
  uploadUrl: string
  key: string
  /** What the proof will be called: PCODE_Doctor_AM_vN.pdf. */
  fileName: string
}

const PDF = 'application/pdf'

export async function listVendorOrderDesigns(orderId: string): Promise<OrderDesign[]> {
  const { data } = await vendorApiClient.get<OrderDesign[]>(`/api/vendor/orders/${orderId}/designs`)
  return data
}

/**
 * Presigns an upload URL and PUTs the file straight to object storage, then registers the new version. Proofs are
 * PDFs, and the file must already be named PCode_DoctorName_AMName.pdf (the AM's SAP code can replace their name): the server checks the
 * name against the order and refuses a file named otherwise, saying what it should have been called -- before anything is uploaded.
 * A good one is stored under the server's tidy name (PCODE_Doctor_AM_vN.pdf).
 */
export async function uploadVendorOrderDesign(orderId: string, file: File): Promise<OrderDesign> {
  // Some systems report no type for a .pdf, so the extension counts too.
  const isPdf = file.type === PDF || (file.type === '' && /\.pdf$/i.test(file.name))
  if (!isPdf) throw new UserFacingError(`"${file.name}" is not a PDF. Proofs must be PDF files.`)
  const { data: presign } = await vendorApiClient.post<PresignDesignResponse>(`/api/vendor/orders/${orderId}/designs/presign`, {
    contentType: PDF,
    fileName: file.name,
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
