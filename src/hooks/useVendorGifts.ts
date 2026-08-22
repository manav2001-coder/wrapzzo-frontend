import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { GiftInput } from '@/api/gifts'
import {
  createVendorGift,
  deleteVendorGiftImage,
  getVendorGift,
  listVendorGifts,
  updateVendorGift,
  uploadVendorGiftImage,
} from '@/api/vendorGifts'

const vendorGiftsKey = ['vendorGifts'] as const
const vendorGiftKey = (id: string) => ['vendorGifts', id] as const

export function useVendorGifts() {
  return useQuery({ queryKey: vendorGiftsKey, queryFn: listVendorGifts })
}

export function useVendorGift(id: string | undefined) {
  return useQuery({ queryKey: vendorGiftKey(id ?? ''), queryFn: () => getVendorGift(id!), enabled: Boolean(id) })
}

export function useCreateVendorGift() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: GiftInput) => createVendorGift(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vendorGiftsKey }),
  })
}

export function useUpdateVendorGift(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: GiftInput) => updateVendorGift(id, input),
    onSuccess: (data) => {
      queryClient.setQueryData(vendorGiftKey(id), data)
      queryClient.invalidateQueries({ queryKey: vendorGiftsKey })
    },
  })
}

export function useUploadVendorGiftImage(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ file, displayOrder }: { file: File; displayOrder: number }) => uploadVendorGiftImage(id, file, displayOrder),
    onSuccess: (data) => {
      queryClient.setQueryData(vendorGiftKey(id), data)
      queryClient.invalidateQueries({ queryKey: vendorGiftsKey })
    },
  })
}

export function useDeleteVendorGiftImage(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (imageId: string) => deleteVendorGiftImage(id, imageId),
    onSuccess: (data) => {
      queryClient.setQueryData(vendorGiftKey(id), data)
      queryClient.invalidateQueries({ queryKey: vendorGiftsKey })
    },
  })
}
