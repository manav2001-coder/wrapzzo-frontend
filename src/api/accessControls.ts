import { apiClient } from '@/lib/axiosClient'

/** One grantable permission: `module.action`. `category` is the module's label, `name` the action's. */
export interface AccessControlItem {
  id: string
  key: string
  module: string
  action: string
  name: string
  description: string | null
  category: string
  type: 'FUNCTIONAL' | 'UI'
  /** Position in the access grid: modules in order, each module's actions in order. */
  sortOrder: number
}

export async function listAccessControlCatalog(): Promise<AccessControlItem[]> {
  const { data } = await apiClient.get<AccessControlItem[]>('/api/access-controls')
  return data
}
