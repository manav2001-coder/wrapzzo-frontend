import { apiClient } from '@/lib/axiosClient'

export type SubmissionStatus = 'DRAFT' | 'SUBMITTED' | 'REJECTED' | 'RESUBMITTED' | 'APPROVED'

export interface SubmissionValueEntry {
  fieldKey: string
  label: string
  value: unknown
}

export interface SubmissionAttachmentEntry {
  fieldKey: string
  label: string
  fileName: string
  url: string
}

export interface Submission {
  id: string
  campaignId: string
  campaignName: string
  submittedById: string
  submittedByName: string
  giftId: string | null
  giftName: string | null
  status: SubmissionStatus
  rejectionReason: string | null
  reviewedByName: string | null
  reviewedAt: string | null
  submittedAt: string | null
  values: SubmissionValueEntry[]
  attachments: SubmissionAttachmentEntry[]
  createdAt: string
}

/** IMAGE/FILE field values are an object referencing an already-uploaded attachment. */
export interface AttachmentValue {
  key: string
  fileName: string
  mimeType: string
  fileSize: number
}

export type SubmissionValues = Record<string, string | number | boolean | string[] | AttachmentValue | undefined>

interface PresignAttachmentResponse {
  uploadUrl: string
  key: string
}

export async function presignSubmissionAttachment(campaignId: string, contentType: string): Promise<PresignAttachmentResponse> {
  const { data } = await apiClient.post<PresignAttachmentResponse>(`/api/campaigns/${campaignId}/submissions/presignAttachment`, {
    contentType,
  })
  return data
}

/** Presigns an upload URL, PUTs the file straight to object storage, and returns the attachment value to submit. */
export async function uploadSubmissionAttachment(campaignId: string, file: File): Promise<AttachmentValue> {
  const presign = await presignSubmissionAttachment(campaignId, file.type)

  const uploadResponse = await fetch(presign.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  })
  if (!uploadResponse.ok) {
    throw new Error(`Upload to storage failed with status ${uploadResponse.status}`)
  }

  return { key: presign.key, fileName: file.name, mimeType: file.type, fileSize: file.size }
}

export async function createSubmission(campaignId: string, giftId: string, values: SubmissionValues): Promise<Submission> {
  const { data } = await apiClient.post<Submission>(`/api/campaigns/${campaignId}/submissions`, { giftId, values })
  return data
}

export async function resubmitSubmission(submissionId: string, giftId: string, values: SubmissionValues): Promise<Submission> {
  const { data } = await apiClient.post<Submission>(`/api/submissions/${submissionId}/resubmit`, { giftId, values })
  return data
}

export async function listCampaignSubmissions(campaignId: string): Promise<Submission[]> {
  const { data } = await apiClient.get<Submission[]>(`/api/campaigns/${campaignId}/submissions`)
  return data
}

export async function listMySubmissions(): Promise<Submission[]> {
  const { data } = await apiClient.get<Submission[]>('/api/submissions/mine')
  return data
}

export async function listPendingApproval(): Promise<Submission[]> {
  const { data } = await apiClient.get<Submission[]>('/api/submissions/pending-approval')
  return data
}

export async function approveSubmission(id: string): Promise<Submission> {
  const { data } = await apiClient.post<Submission>(`/api/submissions/${id}/approve`)
  return data
}

export async function rejectSubmission(id: string, reason: string): Promise<Submission> {
  const { data } = await apiClient.post<Submission>(`/api/submissions/${id}/reject`, { reason })
  return data
}
