import { apiClient } from '@/lib/axiosClient'

export interface OrgUnit {
  id: string
  name: string
  levelName: string
  parentId: string | null
}

export async function listMyOrgUnits(): Promise<OrgUnit[]> {
  const { data } = await apiClient.get<OrgUnit[]>('/api/company/org-units')
  return data
}
