import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  activateCampaign,
  closeCampaign,
  createCampaign,
  getAudienceOptions,
  getCampaign,
  listCampaigns,
  replaceCampaignAudience,
  updateCampaign,
  type AudienceInput,
  type CampaignInput,
} from '@/api/campaigns'

const campaignsKey = ['campaigns'] as const
const campaignKey = (id: string) => ['campaigns', id] as const

export function useCampaigns() {
  return useQuery({ queryKey: campaignsKey, queryFn: listCampaigns })
}

export function useCampaign(id: string | undefined) {
  return useQuery({ queryKey: campaignKey(id ?? ''), queryFn: () => getCampaign(id!), enabled: Boolean(id) })
}

export function useAudienceOptions() {
  return useQuery({ queryKey: ['campaigns', 'audience-options'], queryFn: getAudienceOptions })
}

export function useCreateCampaign() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CampaignInput) => createCampaign(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: campaignsKey }),
  })
}

export function useUpdateCampaign(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CampaignInput) => updateCampaign(id, input),
    onSuccess: (data) => {
      queryClient.setQueryData(campaignKey(id), data)
      queryClient.invalidateQueries({ queryKey: campaignsKey })
    },
  })
}

export function useSetCampaignStatus(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (status: 'ACTIVE' | 'CLOSED') => (status === 'ACTIVE' ? activateCampaign(id) : closeCampaign(id)),
    onSuccess: (data) => {
      queryClient.setQueryData(campaignKey(id), data)
      queryClient.invalidateQueries({ queryKey: campaignsKey })
    },
  })
}

export function useReplaceCampaignAudience(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (audiences: AudienceInput[]) => replaceCampaignAudience(id, audiences),
    onSuccess: (data) => queryClient.setQueryData(campaignKey(id), data),
  })
}
