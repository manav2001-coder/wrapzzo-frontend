import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addMyVendor,
  editMyVendor,
  listMyVendors,
  resendMyVendorInvite,
  setMyVendorActive,
  setMyVendorCoverage,
  type AddMyVendorInput,
  type VendorCoverageInput,
} from '@/api/myVendors'

const myVendorsKey = ['my-vendors'] as const

export function useMyVendors() {
  return useQuery({ queryKey: myVendorsKey, queryFn: listMyVendors })
}

/** Every mutation returns the company's refreshed roster, which replaces the cached one. */
function useRosterMutation<TVariables>(mutationFn: (variables: TVariables) => ReturnType<typeof listMyVendors>) {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn, onSuccess: (data) => queryClient.setQueryData(myVendorsKey, data) })
}

export const useAddMyVendor = () => useRosterMutation((input: AddMyVendorInput) => addMyVendor(input))

export const useSetMyVendorCoverage = () =>
  useRosterMutation(({ vendorId, ...input }: { vendorId: string } & VendorCoverageInput) => setMyVendorCoverage(vendorId, input))

export const useEditMyVendor = () =>
  useRosterMutation(({ vendorId, ...input }: { vendorId: string; name: string; contactPhone?: string }) => editMyVendor(vendorId, input))

export const useSetMyVendorActive = () =>
  useRosterMutation(({ vendorId, active }: { vendorId: string; active: boolean }) => setMyVendorActive(vendorId, active))

export function useResendMyVendorInvite() {
  return useMutation({ mutationFn: (vendorId: string) => resendMyVendorInvite(vendorId) })
}
