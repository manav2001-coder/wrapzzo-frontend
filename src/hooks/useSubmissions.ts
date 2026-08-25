import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  approveSubmission,
  createSubmission,
  listCampaignSubmissions,
  listMySubmissions,
  listPendingApproval,
  rejectSubmission,
  resubmitSubmission,
  type SubmissionValues,
} from '@/api/submissions'

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

export function usePendingApproval() {
  return useQuery({ queryKey: ['submissions', 'pending-approval'], queryFn: listPendingApproval })
}

export function useCreateSubmission(campaignId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ giftId, values }: { giftId: string; values: SubmissionValues }) => createSubmission(campaignId, giftId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] })
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
    },
  })
}

export function useResubmitSubmission(submissionId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ giftId, values }: { giftId: string; values: SubmissionValues }) => resubmitSubmission(submissionId, giftId, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['submissions'] }),
  })
}

export function useApproveSubmission() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => approveSubmission(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

export function useRejectSubmission() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectSubmission(id, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['submissions'] }),
  })
}
