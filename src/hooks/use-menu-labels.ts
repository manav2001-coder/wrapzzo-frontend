import { useMutation, useQueryClient } from '@tanstack/react-query'

import { saveMenuLabels } from '@/api/menuLabels'
import { CURRENT_USER_QUERY_KEY, useCurrentUser } from '@/hooks/use-current-user'

const NONE: Record<string, string> = {}

/** The company's own menu names, menu id -> name (empty for the defaults, a vendor, or while loading). */
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

/** Saves the company's menu names; the profile (and so the sidebar) picks them up straight away. */
export function useSaveMenuLabels() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (labels: Record<string, string>) => saveMenuLabels(labels),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY }),
  })
}
