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
  email: string | null
  address: string | null
  dateOfBirth: string | null
  doctor: DoctorDetails
  createdByName: string | null
  createdAt: string
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
  email?: string
  address?: string
  dateOfBirth?: string
  doctor?: Partial<DoctorDetails>
}

export async function listRecipients(): Promise<Recipient[]> {
  const { data } = await apiClient.get<Recipient[]>('/api/recipients')
  return data
}

/** "Pick an existing doctor" search -- unlike listRecipients(), this works for anyone who can send a gift (request.create), not just recipient.view holders. */
export async function searchRecipients(query: string): Promise<Recipient[]> {
  const { data } = await apiClient.get<Recipient[]>('/api/recipients/search', { params: { q: query } })
  return data
}

/** An MR's own working list (recipient_assignments) -- not the full shared directory. */
export async function listMyRecipients(): Promise<Recipient[]> {
  const { data } = await apiClient.get<Recipient[]>('/api/recipients/mine')
  return data
}

export async function createRecipient(input: CreateRecipientInput): Promise<Recipient> {
  const { data } = await apiClient.post<Recipient>('/api/recipients', input)
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
