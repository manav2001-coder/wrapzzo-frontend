import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { getMenuLabels, saveMenuLabels } from '@/api/menuLabels'
import { CURRENT_USER_QUERY_KEY, useCurrentUser } from '@/hooks/use-current-user'

const NONE: Record<string, string> = {}

/** The signed-in company's menu names, menu id -> name (empty for the defaults, a vendor, or while loading). */
export function useMenuLabels(): Record<string, string> {
  return useCurrentUser().data?.menuLabels ?? NONE
}

/**
 * A page's title, following its menu's name: a company that renamed the "quick-gift" menu sees
 * the same name on the page it opens, not the default.
 */
export function useMenuLabel(menuId: string, fallback: string): string {
  return useMenuLabels()[menuId] ?? fallback
}

const labelsKey = (companyId: string | null | undefined) => ['menuLabels', companyId] as const

/** One company's menu names, for platform staff configuring them. */
export function useCompanyMenuLabels(companyId: string | null | undefined) {
  return useQuery({ queryKey: labelsKey(companyId), queryFn: () => getMenuLabels(companyId!), enabled: Boolean(companyId) })
}

/** Saves a company's menu names; its own users pick them up from their profile on the next refresh. */
export function useSaveCompanyMenuLabels(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (labels: Record<string, string>) => saveMenuLabels(companyId, labels),
    onSuccess: (saved) => {
      queryClient.setQueryData(labelsKey(companyId), saved)
      void queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY })
    },
  })
}
