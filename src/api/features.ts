import { apiClient } from '@/lib/axiosClient'

/** One entry of the feature master: a permission key. The keys live in code; they can be switched off, never added. */
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
  active: boolean
  sortOrder: number
}

export async function listFeatures(): Promise<Feature[]> {
  const { data } = await apiClient.get<Feature[]>('/api/platform/features')
  return data
}

export async function setFeatureActive(featureId: string, active: boolean): Promise<Feature> {
  const { data } = await apiClient.put<Feature>(`/api/platform/features/${featureId}/active`, { active })
  return data
}
