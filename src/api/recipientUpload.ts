import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export interface RecipientUploadDetails {
  recipientName: string | null
  companyName: string
  giftName: string | null
  giftDescription: string | null
  giftImageUrls: string[]
  alreadyUploaded: boolean
}

interface PresignResponse {
  uploadUrl: string
  key: string
}

/**
 * Deliberately raw axios, not apiClient -- this is reached from an emailed link by an
 * unauthenticated recipient with no Wrapzzo session at all, and doesn't need the client's
 * auth-refresh interceptor.
 */
export async function getRecipientUploadDetails(token: string): Promise<RecipientUploadDetails> {
  const { data } = await axios.get<RecipientUploadDetails>(`${API_BASE_URL}/api/public/recipient-upload/${token}`)
  return data
}

async function presignRecipientUpload(token: string, contentType: string): Promise<PresignResponse> {
  const { data } = await axios.post<PresignResponse>(`${API_BASE_URL}/api/public/recipient-upload/${token}/presignAttachment`, {
    contentType,
  })
  return data
}

/** Presigns an upload URL, PUTs the file straight to object storage, then attaches it to the submission. */
export async function uploadRecipientPhoto(token: string, file: File): Promise<void> {
  const presign = await presignRecipientUpload(token, file.type)

  const uploadResponse = await fetch(presign.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  })
  if (!uploadResponse.ok) {
    throw new Error(`Upload to storage failed with status ${uploadResponse.status}`)
  }

  await axios.post(`${API_BASE_URL}/api/public/recipient-upload/${token}/submit`, {
    key: presign.key,
    fileName: file.name,
    mimeType: file.type,
    fileSize: file.size,
  })
}
