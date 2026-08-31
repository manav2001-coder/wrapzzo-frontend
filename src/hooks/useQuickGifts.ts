import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  approveQuickGiftRequest,
  createQuickGiftRequest,
  getQuickGiftRequest,
  listMyQuickGiftRequests,
  listPendingQuickGiftApprovals,
  rejectQuickGiftRequest,
  requestQuickGiftPhotoLink,
  type CreateQuickGiftInput,
} from '@/api/quickGifts'

export function useMyQuickGiftRequests() {
  return useQuery({ queryKey: ['quick-gifts', 'mine'], queryFn: listMyQuickGiftRequests })
}

export function useQuickGiftRequest(id: string | undefined) {
  return useQuery({
    queryKey: ['quick-gifts', id],
    queryFn: () => getQuickGiftRequest(id!),
    enabled: Boolean(id),
  })
}

export function useCreateQuickGiftRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateQuickGiftInput) => createQuickGiftRequest(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quick-gifts'] }),
  })
}

export function useRequestQuickGiftPhotoLink() {
  return useMutation({ mutationFn: (id: string) => requestQuickGiftPhotoLink(id) })
}

// --- Approval (Company Admin) ---

export function usePendingQuickGiftApprovals() {
  return useQuery({ queryKey: ['quick-gifts', 'pending-approval'], queryFn: listPendingQuickGiftApprovals })
}

export function useApproveQuickGiftRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => approveQuickGiftRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-gifts'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

export function useRejectQuickGiftRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectQuickGiftRequest(id, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quick-gifts'] }),
  })
}
