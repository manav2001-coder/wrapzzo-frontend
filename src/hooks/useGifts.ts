import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  activateGift,
  createGift,
  deactivateGift,
  deleteGiftImage,
  getGift,
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

export function useSetGiftStatus(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (active: boolean) => (active ? activateGift(id) : deactivateGift(id)),
    onSuccess: (data) => {
      queryClient.setQueryData(giftKey(id), data)
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
