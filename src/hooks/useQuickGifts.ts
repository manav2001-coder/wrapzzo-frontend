import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createQuickGiftRequest,
  getQuickGiftRequest,
  requestQuickGiftPhotoLink,
  type CreateQuickGiftInput,
} from '@/api/quickGifts'
import { countOf } from '@/lib/server-list'

/** How many requests the caller has sent -- the tab badge. The list itself is a paged DataTable (serverFetcher). */
export function useMyQuickGiftCount() {
  return useQuery({ queryKey: ['quick-gifts', 'mine', 'count'], queryFn: () => countOf('/api/quick-gifts/mine/page') })
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
    onSuccess: () =>
      Promise.all([queryClient.invalidateQueries({ queryKey: ['quick-gifts'] }), queryClient.invalidateQueries({ queryKey: ['table-data'] })]),
  })
}

export function useRequestQuickGiftPhotoLink() {
  return useMutation({ mutationFn: (id: string) => requestQuickGiftPhotoLink(id) })
}
