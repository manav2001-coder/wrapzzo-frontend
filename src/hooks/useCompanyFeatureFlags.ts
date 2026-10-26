import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listCompanyFeatureFlags, setCompanyFeatureFlag, type CompanyFeatureKey } from '@/api/companyFeatureFlags'

const featureFlagsKey = (companyId: string) => ['company-feature-flags', companyId] as const

export function useCompanyFeatureFlags(companyId: string | undefined) {
  return useQuery({
    queryKey: featureFlagsKey(companyId ?? ''),
    queryFn: () => listCompanyFeatureFlags(companyId!),
    enabled: Boolean(companyId),
  })
}

export function useSetCompanyFeatureFlag(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ flagKey, enabled }: { flagKey: CompanyFeatureKey; enabled: boolean }) => setCompanyFeatureFlag(companyId, flagKey, enabled),
    onSuccess: (data) => queryClient.setQueryData(featureFlagsKey(companyId), data),
  })
}
