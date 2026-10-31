import { apiClient } from '@/lib/axiosClient'

const base = (companyId: string) => `/api/platform/companies/${companyId}/menu-labels`

/** The names a company gives its menus, menu id -> name. The company's own users read them from /api/auth/me; this is the editor's side. */
export async function getMenuLabels(companyId: string): Promise<Record<string, string>> {
  const { data } = await apiClient.get<Record<string, string>>(base(companyId))
  return data
}

/** Replace-all: a menu left out (or blank) goes back to its default name. */
export async function saveMenuLabels(companyId: string, labels: Record<string, string>): Promise<Record<string, string>> {
  const { data } = await apiClient.put<Record<string, string>>(base(companyId), { labels })
  return data
}
