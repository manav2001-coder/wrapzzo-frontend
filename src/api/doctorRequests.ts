import { apiClient } from '@/lib/axiosClient'

export type DoctorChangeAction = 'ADD' | 'EDIT' | 'REMOVE'
export type DoctorChangeStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface DoctorChangeRequest {
  id: string
  action: DoctorChangeAction
  recipientId: string | null
  recipientName: string | null
  proposedName: string | null
  proposedPhone: string | null
  proposedEmail: string | null
  proposedAddress: string | null
  proposedDob: string | null
  requestedByName: string
  status: DoctorChangeStatus
  reviewedByName: string | null
  reviewedAt: string | null
  rejectionReason: string | null
  createdAt: string
}

export interface CreateDoctorChangeInput {
  action: DoctorChangeAction
  recipientId?: string
  proposedName?: string
  proposedPhone?: string
  proposedEmail?: string
  proposedAddress?: string
  proposedDob?: string
}

export async function createDoctorChangeRequest(input: CreateDoctorChangeInput): Promise<DoctorChangeRequest> {
  const { data } = await apiClient.post<DoctorChangeRequest>('/api/doctor-requests', input)
  return data
}

export async function listMyDoctorChangeRequests(): Promise<DoctorChangeRequest[]> {
  const { data } = await apiClient.get<DoctorChangeRequest[]>('/api/doctor-requests/mine')
  return data
}

export async function listPendingDoctorChangeRequests(): Promise<DoctorChangeRequest[]> {
  const { data } = await apiClient.get<DoctorChangeRequest[]>('/api/doctor-requests/pending-review')
  return data
}

export async function approveDoctorChangeRequest(id: string): Promise<DoctorChangeRequest> {
  const { data } = await apiClient.post<DoctorChangeRequest>(`/api/doctor-requests/${id}/approve`)
  return data
}

export async function rejectDoctorChangeRequest(id: string, reason: string): Promise<DoctorChangeRequest> {
  const { data } = await apiClient.post<DoctorChangeRequest>(`/api/doctor-requests/${id}/reject`, { reason })
  return data
}
