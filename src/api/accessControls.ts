import { apiClient } from '@/lib/axiosClient'

export interface AccessControlItem {
  id: string
  key: string
  name: string
  description: string | null
  category: string
  type: 'FUNCTIONAL' | 'UI'
}

export async function listAccessControlCatalog(): Promise<AccessControlItem[]> {
  const { data } = await apiClient.get<AccessControlItem[]>('/api/access-controls')
  return data
}
