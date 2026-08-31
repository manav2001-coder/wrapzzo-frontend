import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createSubmission, listCampaignSubmissions, listMySubmissions, requestPhotoLink, type SubmissionValues } from '@/api/submissions'

export function useCampaignSubmissions(campaignId: string | undefined) {
  return useQuery({
    queryKey: ['submissions', 'campaign', campaignId],
    queryFn: () => listCampaignSubmissions(campaignId!),
    enabled: Boolean(campaignId),
  })
}

export function useMySubmissions() {
  return useQuery({ queryKey: ['submissions', 'mine'], queryFn: listMySubmissions })
}

export function useCreateSubmission(campaignId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ giftId, values }: { giftId: string; values: SubmissionValues }) => createSubmission(campaignId, giftId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] })
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

export function useRequestPhotoLink() {
  return useMutation({ mutationFn: (id: string) => requestPhotoLink(id) })
}
