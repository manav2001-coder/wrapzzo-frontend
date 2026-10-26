import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addVendor,
  editVendor,
  listVendors,
  reactivateVendor,
  resendVendorInvite,
  suspendVendor,
  type AddVendorInput,
  type EditVendorInput,
} from '@/api/vendors'

const vendorsKey = ['vendors'] as const

export function useVendors() {
  return useQuery({ queryKey: vendorsKey, queryFn: listVendors })
}

export function useAddVendor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: AddVendorInput) => addVendor(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vendorsKey }),
  })
}

/** Edit any vendor -- the id travels with the call, so the list's drawer serves every row. */
export function useEditVendor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: EditVendorInput }) => editVendor(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vendorsKey }),
  })
}

/** Suspend or reactivate any vendor. */
export function useSetVendorStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => (active ? reactivateVendor(id) : suspendVendor(id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vendorsKey }),
  })
}

export function useResendVendorInvite() {
  return useMutation({ mutationFn: (id: string) => resendVendorInvite(id) })
}
