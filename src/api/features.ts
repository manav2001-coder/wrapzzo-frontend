import { apiClient } from '@/lib/axiosClient'

/**
 * One entry of the feature master: a permission key. The keys live in code and are never added
 * here -- a company registers them (and switches them on or off). In the platform catalogue
 * (`listFeatureCatalog`) `registered` and `active` are simply true.
 */
export interface Feature {
  id: string
  key: string
  module: string
  action: string
  name: string
  description: string | null
  /** The module's label. */
  category: string
  companyAssignable: boolean
  /** The company has this key. */
  registered: boolean
  /** The company has it switched on. */
  active: boolean
  sortOrder: number
}

export async function listCompanyFeatures(companyId: string): Promise<Feature[]> {
  const { data } = await apiClient.get<Feature[]>(`/api/platform/companies/${companyId}/access-features`)
  return data
}

/** Platform staff: every key (for system templates). A company: the keys it can hold. */
export async function listFeatureCatalog(): Promise<Feature[]> {
  const { data } = await apiClient.get<Feature[]>('/api/platform/access-features')
  return data
}

/** Registers features for a company; with no ids, every one it is missing. Returns the company's refreshed list. */
export async function registerFeatures(companyId: string, featureIds?: string[]): Promise<Feature[]> {
  const { data } = await apiClient.post<Feature[]>(`/api/platform/companies/${companyId}/access-features/register`, featureIds ? { featureIds } : {})
  return data
}

export async function setFeatureActive(companyId: string, featureId: string, active: boolean): Promise<Feature> {
  const { data } = await apiClient.put<Feature>(`/api/platform/companies/${companyId}/access-features/${featureId}/active`, { active })
  return data
}
