import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { getArtworkApprovalSettings, setArtworkApprovalSteps, type ArtworkApprovalStep } from '@/api/artworkApproval'

const KEY = ['artwork-approval-settings'] as const

export function useArtworkApprovalSettings(enabled = true) {
  return useQuery({ queryKey: KEY, queryFn: getArtworkApprovalSettings, enabled })
}

export function useSetArtworkApprovalSteps() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (steps: ArtworkApprovalStep[]) => setArtworkApprovalSteps(steps),
    onSuccess: (settings) => queryClient.setQueryData(KEY, settings),
  })
}
