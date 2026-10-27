import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export type RecipientUploadKind = 'recipient' | 'quick-gift'

function basePath(kind: RecipientUploadKind, token: string): string {
  return kind === 'quick-gift' ? `${API_BASE_URL}/api/public/quick-gift-upload/${token}` : `${API_BASE_URL}/api/public/recipient-upload/${token}`
}

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
 * unauthenticated recipient with no Wrappzo session at all, and doesn't need the client's
 * auth-refresh interceptor. `kind` picks between a Campaign submission's photo request and
 * a Quick Gift request's -- same shape, different backend path.
 */
export async function getRecipientUploadDetails(token: string, kind: RecipientUploadKind = 'recipient'): Promise<RecipientUploadDetails> {
  const { data } = await axios.get<RecipientUploadDetails>(basePath(kind, token))
  return data
}

async function presignRecipientUpload(token: string, contentType: string, kind: RecipientUploadKind): Promise<PresignResponse> {
  const { data } = await axios.post<PresignResponse>(`${basePath(kind, token)}/presignAttachment`, { contentType })
  return data
}

/** Presigns an upload URL, PUTs the file straight to object storage, then attaches it. */
export async function uploadRecipientPhoto(token: string, file: File, kind: RecipientUploadKind = 'recipient'): Promise<void> {
  const presign = await presignRecipientUpload(token, file.type, kind)

  const uploadResponse = await fetch(presign.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  })
  if (!uploadResponse.ok) {
    throw new Error(`Upload to storage failed with status ${uploadResponse.status}`)
  }

  await axios.post(`${basePath(kind, token)}/submit`, {
    key: presign.key,
    fileName: file.name,
    mimeType: file.type,
    fileSize: file.size,
  })
}
