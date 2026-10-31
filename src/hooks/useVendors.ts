import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addVendor,
  editVendor,
  getVendorCoverage,
  listVendors,
  reactivateVendor,
  replaceVendorCoverage,
  resendVendorInvite,
  suspendVendor,
  type AddVendorInput,
  type CompanyCoverage,
  type EditVendorInput,
} from '@/api/vendors'

const vendorsKey = ['vendors'] as const

/** All vendors, or -- with a company -- the ones serving it. */
export function useVendors(companyId?: string | null) {
  return useQuery({ queryKey: [...vendorsKey, companyId ?? 'all'], queryFn: () => listVendors(companyId) })
}

export function useVendorCoverage(id: string | undefined) {
  return useQuery({ queryKey: ['vendor-coverage', id], queryFn: () => getVendorCoverage(id!), enabled: Boolean(id) })
}

/** Set where a vendor serves; the lists that depend on it (vendors per company, a company's catalogue) refresh. */
export function useReplaceVendorCoverage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, companies }: { id: string; companies: CompanyCoverage[] }) => replaceVendorCoverage(id, companies),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: vendorsKey })
      void queryClient.invalidateQueries({ queryKey: ['vendor-coverage', id] })
      void queryClient.invalidateQueries({ queryKey: ['company-vendors'] })
    },
  })
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
