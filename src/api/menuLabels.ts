import { apiClient } from '@/lib/axiosClient'

/** The company's own menu names, menu id -> name. Everyone reads them from /api/auth/me; this is the editor's side. */
export async function getMenuLabels(): Promise<Record<string, string>> {
  const { data } = await apiClient.get<Record<string, string>>('/api/company/menu-labels')
  return data
}

/** Replace-all: a menu left out (or blank) goes back to its default name. */
export async function saveMenuLabels(labels: Record<string, string>): Promise<Record<string, string>> {
  const { data } = await apiClient.put<Record<string, string>>('/api/company/menu-labels', { labels })
  return data
}
