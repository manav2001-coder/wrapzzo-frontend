import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  activateGift,
  createGift,
  deactivateGift,
  deleteGiftImage,
  getGift,
  listActiveGifts,
  listGifts,
  updateGift,
  uploadGiftImage,
  type GiftInput,
} from '@/api/gifts'

const giftsKey = ['gifts'] as const
const giftKey = (id: string) => ['gifts', id] as const

export function useGifts() {
  return useQuery({ queryKey: giftsKey, queryFn: listGifts })
}

/** The Gift Store, for pickers on the company side (Campaigns, Quick Gift, Bulk Gifting). */
export function useActiveGifts() {
  return useQuery({ queryKey: ['gifts', 'active'], queryFn: listActiveGifts })
}

export function useGift(id: string | undefined) {
  return useQuery({ queryKey: giftKey(id ?? ''), queryFn: () => getGift(id!), enabled: Boolean(id) })
}

export function useCreateGift() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: GiftInput) => createGift(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: giftsKey }),
  })
}

export function useUpdateGift(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: GiftInput) => updateGift(id, input),
    onSuccess: (data) => {
      queryClient.setQueryData(giftKey(id), data)
      queryClient.invalidateQueries({ queryKey: giftsKey })
    },
  })
}

/** Put any gift in or out of stock -- the id travels with the call, so one hook serves a whole list. */
export function useSetGiftStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => (active ? activateGift(id) : deactivateGift(id)),
    onSuccess: (data) => {
      queryClient.setQueryData(giftKey(data.id), data)
      queryClient.invalidateQueries({ queryKey: giftsKey })
    },
  })
}

export function useUploadGiftImage(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ file, displayOrder }: { file: File; displayOrder: number }) => uploadGiftImage(id, file, displayOrder),
    onSuccess: (data) => {
      queryClient.setQueryData(giftKey(id), data)
      queryClient.invalidateQueries({ queryKey: giftsKey })
    },
  })
}

export function useDeleteGiftImage(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (imageId: string) => deleteGiftImage(id, imageId),
    onSuccess: (data) => {
      queryClient.setQueryData(giftKey(id), data)
      queryClient.invalidateQueries({ queryKey: giftsKey })
    },
  })
}
