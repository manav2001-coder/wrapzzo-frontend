import { apiClient } from '@/lib/axiosClient'

/** What a personalised prescription pad is printed with. The registration number is the doctor's dedupe key. */
export interface DoctorDetails {
  qualification: string | null
  registrationNumber: string | null
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
  dateOfBirth: string | null
  doctor: DoctorDetails
  createdByName: string | null
  createdAt: string
  /** On the caller's own list (added by them or mapped to them) -- the only doctors they can remove. */
  inMyList: boolean
}

export interface UpcomingBirthday {
  id: string
  name: string
  phone: string
  email: string | null
  address: string | null
  dateOfBirth: string
  daysUntilBirthday: number
}

export interface CreateRecipientInput {
  name: string
  phone: string
  /** Required: the doctor's unique identifier. */
  pcode: string
  email?: string
  address?: string
  dateOfBirth?: string
  doctor?: Partial<DoctorDetails>
}

export async function listRecipients(): Promise<Recipient[]> {
  const { data } = await apiClient.get<Recipient[]>('/api/recipients')
  return data
}

/** "Pick an existing doctor" search -- unlike listRecipients(), this works for anyone who can send a gift (quick_gift.create), not just doctor.view holders. */
export async function searchRecipients(query: string): Promise<Recipient[]> {
  const { data } = await apiClient.get<Recipient[]>('/api/recipients/search', { params: { q: query } })
  return data
}

/** The doctors on the caller's own list -- who the Quick Gift form offers first. */
export async function listMyRecipients(): Promise<Recipient[]> {
  const { data } = await apiClient.get<Recipient[]>('/api/recipients/mine')
  return data
}

export async function updateRecipient(id: string, input: CreateRecipientInput): Promise<Recipient> {
  const { data } = await apiClient.put<Recipient>(`/api/recipients/${id}`, input)
  return data
}

export async function listUpcomingBirthdays(days = 30): Promise<UpcomingBirthday[]> {
  const { data } = await apiClient.get<UpcomingBirthday[]>('/api/recipients/upcoming-birthdays', { params: { days } })
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
  const { data } = await apiClient.post<BulkDoctorsResult>('/api/recipients/mine/bulk', { rows })
  return data
}
