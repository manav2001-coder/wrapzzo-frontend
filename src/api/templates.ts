import { apiClient } from '@/lib/axiosClient'

/**
 * An access template: a named bundle of permission keys that can include other templates. A null
 * companyId is a system master template (platform staff edit it; a company clones it).
 */
export interface AccessTemplate {
  id: string
  companyId: string | null
  name: string
  description: string | null
  active: boolean
  system: boolean
  /** Keys the template grants itself. */
  accessControlIds: string[]
  /** Templates it includes. */
  referencedTemplateIds: string[]
  /** Everything it grants once its includes are followed. */
  effectiveAccessControlIds: string[]
  roleCount: number
  userCount: number
}

export interface TemplateInput {
  name: string
  description?: string
  active: boolean
  accessControlIds: string[]
  referencedTemplateIds: string[]
}

const companyBase = (companyId: string) => `/api/platform/companies/${companyId}/templates`

export async function listTemplates(companyId: string): Promise<AccessTemplate[]> {
  const { data } = await apiClient.get<AccessTemplate[]>(companyBase(companyId))
  return data
}

export async function listSystemTemplates(): Promise<AccessTemplate[]> {
  const { data } = await apiClient.get<AccessTemplate[]>('/api/platform/system-templates')
  return data
}

/** A null companyId creates a system master template (platform staff only). */
export async function createTemplate(companyId: string | null, input: TemplateInput): Promise<AccessTemplate> {
  const url = companyId ? companyBase(companyId) : '/api/platform/system-templates'
  const { data } = await apiClient.post<AccessTemplate>(url, input)
  return data
}

export async function updateTemplate(templateId: string, input: TemplateInput): Promise<AccessTemplate> {
  const { data } = await apiClient.put<AccessTemplate>(`/api/platform/templates/${templateId}`, input)
  return data
}

export async function cloneTemplate(companyId: string, templateId: string, name: string): Promise<AccessTemplate> {
  const { data } = await apiClient.post<AccessTemplate>(`${companyBase(companyId)}/${templateId}/clone`, { name })
  return data
}

export async function deleteTemplate(templateId: string): Promise<void> {
  await apiClient.delete(`/api/platform/templates/${templateId}`)
}

/** Why one template could not be included in another. */
export interface ReferenceRejection {
  templateId: string
  name: string | null
  reason: string
}

export interface AddReferencesResult {
  added: number
  totalRequested: number
  errors: ReferenceRejection[]
  template: AccessTemplate
}

export async function addTemplateReferences(templateId: string, templateIds: string[]): Promise<AddReferencesResult> {
  const { data } = await apiClient.post<AddReferencesResult>(`/api/platform/templates/${templateId}/references`, { templateIds })
  return data
}

export async function removeTemplateReference(templateId: string, referencedId: string): Promise<AccessTemplate> {
  const { data } = await apiClient.delete<AccessTemplate>(`/api/platform/templates/${templateId}/references/${referencedId}`)
  return data
}

export async function getUserTemplates(companyId: string, userId: string): Promise<string[]> {
  const { data } = await apiClient.get<string[]>(`/api/platform/companies/${companyId}/users/${userId}/templates`)
  return data
}

export async function replaceUserTemplates(companyId: string, userId: string, templateIds: string[]): Promise<string[]> {
  const { data } = await apiClient.put<string[]>(`/api/platform/companies/${companyId}/users/${userId}/templates`, { templateIds })
  return data
}

export interface BulkUserTemplateResult {
  userId: string
  userName: string | null
  added: number
  skipped: number
  status: 'ok' | 'failed'
  error: string | null
}

export async function bulkAssignUserTemplates(companyId: string, userIds: string[], templateIds: string[]): Promise<BulkUserTemplateResult[]> {
  const { data } = await apiClient.post<{ results: BulkUserTemplateResult[] }>(
    `/api/platform/companies/${companyId}/users/templates/bulk-assign`,
    { userIds, templateIds },
  )
  return data.results
}
