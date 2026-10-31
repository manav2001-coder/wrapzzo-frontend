import { useQuery } from '@tanstack/react-query'

import type { CatalogueEntry } from '@/lib/tbac-modules'
import { getResource } from '@/lib/masters-api'

/** Every permission key a company could register, with its module and action names. */
export function useFeatureCatalogue() {
  return useQuery({
    queryKey: ['tbac', 'feature-catalogue'],
    queryFn: () => getResource<CatalogueEntry[]>('/api/tbac/features/catalogue'),
    staleTime: Infinity,
  })
}
