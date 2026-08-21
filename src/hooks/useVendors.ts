import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addVendor,
  editVendor,
  getVendor,
  listVendors,
  reactivateVendor,
  suspendVendor,
  type AddVendorInput,
  type EditVendorInput,
} from '@/api/vendors'

const vendorsKey = ['vendors'] as const
const vendorKey = (id: string) => ['vendors', id] as const

export function useVendors() {
  return useQuery({ queryKey: vendorsKey, queryFn: listVendors })
}

export function useVendor(id: string | undefined) {
  return useQuery({ queryKey: vendorKey(id ?? ''), queryFn: () => getVendor(id!), enabled: Boolean(id) })
}

export function useAddVendor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: AddVendorInput) => addVendor(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vendorsKey }),
  })
}

export function useEditVendor(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: EditVendorInput) => editVendor(id, input),
    onSuccess: (data) => {
      queryClient.setQueryData(vendorKey(id), data)
      queryClient.invalidateQueries({ queryKey: vendorsKey })
    },
  })
}

export function useSetVendorStatus(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (active: boolean) => (active ? reactivateVendor(id) : suspendVendor(id)),
    onSuccess: (data) => {
      queryClient.setQueryData(vendorKey(id), data)
      queryClient.invalidateQueries({ queryKey: vendorsKey })
    },
  })
}
