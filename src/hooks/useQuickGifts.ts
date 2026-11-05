import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createQuickGiftRequest,
  getQuickGiftRequest,
  listMyQuickGiftRequests,
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
