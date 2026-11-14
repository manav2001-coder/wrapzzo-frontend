import { waitForImport, type ImportJob } from '@/api/importJobs'
import { apiClient } from '@/lib/axiosClient'
import type { Paginated } from '@/lib/list-filter'

/** What a personalised prescription pad is printed with, beyond the doctor's name and pcode. */
export interface DoctorDetails {
  qualification: string | null
  speciality: string | null
  clinicName: string | null
}

export interface Recipient {
  id: string
  name: string
  phone: string
  /** The doctor's unique identifier; null only for a doctor that predates pcodes. */
  pcode: string | null
  email: string | null
  address: string | null
  doctor: DoctorDetails
  createdByName: string | null
  createdAt: string
  /** On the caller's own list (added by them or mapped to them) -- the only doctors they can remove. */
  inMyList: boolean
}

export interface CreateRecipientInput {
  name: string
  phone: string
  /** Required: the doctor's unique identifier. */
  pcode: string
  email?: string
  address?: string
  doctor?: Partial<DoctorDetails>
}

/** "Pick an existing doctor" search -- unlike the Doctors list, this works for anyone who can send a gift (quick_gift.create), not just doctor.view holders. */
export async function searchRecipients(query: string): Promise<Recipient[]> {
  const { data } = await apiClient.get<Recipient[]>('/api/recipients/search', { params: { q: query } })
  return data
}

/** One page of the doctors on the caller's own list -- who the Quick Gift form offers first -- narrowed by what was typed. */
export async function listMyRecipientsPage(page: number, pageSize: number, search: string): Promise<Paginated<Recipient>> {
  const { data } = await apiClient.get<Paginated<Recipient>>('/api/recipients/mine/page', {
    params: { page, size: pageSize, ...(search ? { search } : {}), sort: 'name', dir: 'asc' },
  })
  return data
}

export async function updateRecipient(id: string, input: CreateRecipientInput): Promise<Recipient> {
  const { data } = await apiClient.put<Recipient>(`/api/recipients/${id}`, input)
  return data
}

/** Adds a doctor and puts them on the caller's list -- takes effect at once, no approval step. */
export async function createMyDoctor(input: CreateRecipientInput): Promise<Recipient> {
  const { data } = await apiClient.post<Recipient>('/api/recipients/mine', input)
  return data
}

/** Takes the doctor off the caller's list; they stay a company doctor. */
export async function removeMyDoctor(id: string): Promise<void> {
  await apiClient.delete(`/api/recipients/mine/${id}`)
}

export interface BulkDoctorsResult {
  created: number
  joined: number
  unchanged: number
}

/** A sheet of doctors onto the caller's own list, all or none. */
export async function bulkCreateMyDoctors(rows: CreateRecipientInput[]): Promise<BulkDoctorsResult> {
  const { data } = await apiClient.post<ImportJob>('/api/recipients/mine/bulk', { rows })
  const done = await waitForImport(data)
  return { created: done.counts.created ?? 0, joined: done.counts.joined ?? 0, unchanged: done.counts.unchanged ?? 0 }
}
