import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getArtworkApprovalLevels,
  listCompanyFeatureFlags,
  setArtworkApprovalLevels,
  setCompanyFeatureFlag,
  type CompanyFeatureKey,
} from '@/api/companyFeatureFlags'

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

const approvalLevelsKey = (companyId: string) => ['company-artwork-approval-levels', companyId] as const

export function useArtworkApprovalLevels(companyId: string | undefined) {
  return useQuery({
    queryKey: approvalLevelsKey(companyId ?? ''),
    queryFn: () => getArtworkApprovalLevels(companyId!),
    enabled: Boolean(companyId),
  })
}

export function useSetArtworkApprovalLevels(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (levels: number) => setArtworkApprovalLevels(companyId, levels),
    onSuccess: (levels) => queryClient.setQueryData(approvalLevelsKey(companyId), levels),
  })
}
