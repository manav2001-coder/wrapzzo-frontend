import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addMyVendor, listAvailableVendors, listMyVendors, removeMyVendor, setMyVendorCoverage, type AddMyVendorInput, type VendorCoverageInput } from '@/api/myVendors'

const myVendorsKey = ['my-vendors'] as const

export function useMyVendors() {
  return useQuery({ queryKey: myVendorsKey, queryFn: listMyVendors })
}

export function useAddMyVendor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: AddMyVendorInput) => addMyVendor(input),
    onSuccess: (data) => queryClient.setQueryData(myVendorsKey, data),
  })
}

export function useAvailableVendors(enabled = true) {
  return useQuery({ queryKey: ['my-vendors', 'available'], queryFn: listAvailableVendors, enabled })
}

export function useSetMyVendorCoverage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ vendorId, ...input }: { vendorId: string } & VendorCoverageInput) => setMyVendorCoverage(vendorId, input),
    onSuccess: (data) => queryClient.setQueryData(myVendorsKey, data),
  })
}

export function useRemoveMyVendor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vendorId: string) => removeMyVendor(vendorId),
    onSuccess: (data) => queryClient.setQueryData(myVendorsKey, data),
  })
}
