import { apiClient } from '@/lib/axiosClient'

export type CampaignPurpose =
  | 'PRODUCT_LAUNCH'
  | 'EMPLOYEE_RECOGNITION'
  | 'FESTIVAL'
  | 'EVENT'
  | 'CONFERENCE'
  | 'CLIENT_ENGAGEMENT'
  | 'HCP_ENGAGEMENT'
  | 'DISTRIBUTOR_ENGAGEMENT'
  | 'REWARDS'
  | 'OTHER'

export type CampaignRecipientCategory =
  | 'EMPLOYEE'
  | 'CLIENT'
  | 'CUSTOMER'
  | 'HCP_DOCTOR'
  | 'DISTRIBUTOR'
  | 'STOCKIST'
  | 'DEALER'
  | 'VENDOR_PARTNER'
  | 'EVENT_ATTENDEE'
  | 'OTHER'

export type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED'

export type FieldType =
  | 'TEXT'
  | 'TEXTAREA'
  | 'NUMBER'
  | 'EMAIL'
  | 'PHONE'
  | 'DATE'
  | 'SELECT'
  | 'MULTISELECT'
  | 'CHECKBOX'
  | 'RADIO'
  | 'BOOLEAN'
  | 'IMAGE'
  | 'FILE'

export type CampaignAudienceType = 'ALL_COMPANY_USERS' | 'ORG_UNIT' | 'MANAGER_TEAM' | 'SELECTED_USERS'

export interface CampaignField {
  id: string
  fieldKey: string
  label: string
  fieldType: FieldType
  required: boolean
  placeholder: string | null
  options: string[]
  displayOrder: number
}

export interface CampaignAudience {
  id: string
  type: CampaignAudienceType
  orgUnitId: string | null
  orgUnitName: string | null
  anchorUserId: string | null
  anchorUserName: string | null
  userId: string | null
  userName: string | null
}

export interface GiftSummary {
  id: string
  name: string
}

export interface Campaign {
  id: string
  displayId: string
  name: string
  purpose: CampaignPurpose
  recipientCategory: CampaignRecipientCategory
  /** At least one, always -- gift selection is mandatory; a recipient may be given any one of these (chosen per-submission). */
  gifts: GiftSummary[]
  instructions: string | null
  submissionDeadline: string | null
  status: CampaignStatus
  fields: CampaignField[]
  audiences: CampaignAudience[]
  submissionCount: number
  pendingApprovalCount: number
  orderCount: number
  createdAt: string
}

export interface CampaignInput {
  name: string
  purpose: CampaignPurpose
  recipientCategory: CampaignRecipientCategory
  giftIds: string[]
  instructions?: string
  submissionDeadline?: string
}

export interface FieldInput {
  fieldKey: string
  label: string
  fieldType: FieldType
  required: boolean
  placeholder?: string
  options: string[]
}

export interface AudienceInput {
  type: CampaignAudienceType
  orgUnitId?: string
  anchorUserId?: string
  userId?: string
}

export interface AudienceOptions {
  orgUnits: { id: string; name: string; levelName: string }[]
  users: { id: string; name: string; email: string }[]
}

export async function listCampaigns(): Promise<Campaign[]> {
  const { data } = await apiClient.get<Campaign[]>('/api/campaigns')
  return data
}

export async function getCampaign(id: string): Promise<Campaign> {
  const { data } = await apiClient.get<Campaign>(`/api/campaigns/${id}`)
  return data
}

export async function createCampaign(input: CampaignInput): Promise<Campaign> {
  const { data } = await apiClient.post<Campaign>('/api/campaigns', input)
  return data
}

export async function updateCampaign(id: string, input: CampaignInput): Promise<Campaign> {
  const { data } = await apiClient.post<Campaign>(`/api/campaigns/${id}`, input)
  return data
}

export async function activateCampaign(id: string): Promise<Campaign> {
  const { data } = await apiClient.post<Campaign>(`/api/campaigns/${id}/activate`)
  return data
}

export async function closeCampaign(id: string): Promise<Campaign> {
  const { data } = await apiClient.post<Campaign>(`/api/campaigns/${id}/close`)
  return data
}

export async function replaceCampaignFields(id: string, fields: FieldInput[]): Promise<Campaign> {
  const { data } = await apiClient.put<Campaign>(`/api/campaigns/${id}/fields`, { fields })
  return data
}

export async function replaceCampaignAudience(id: string, audiences: AudienceInput[]): Promise<Campaign> {
  const { data } = await apiClient.put<Campaign>(`/api/campaigns/${id}/audience`, { audiences })
  return data
}

export async function getAudienceOptions(): Promise<AudienceOptions> {
  const { data } = await apiClient.get<AudienceOptions>('/api/campaigns/audience-options')
  return data
}
