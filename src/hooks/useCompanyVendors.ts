import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { assignCompanyVendor, listCompanyVendors, unassignCompanyVendor } from '@/api/companyVendors'

const companyVendorsKey = (companyId: string) => ['company-vendors', companyId] as const

export function useCompanyVendors(companyId: string | undefined) {
  return useQuery({
    queryKey: companyVendorsKey(companyId ?? ''),
    queryFn: () => listCompanyVendors(companyId!),
    enabled: Boolean(companyId),
  })
}

export function useAssignCompanyVendor(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vendorId: string) => assignCompanyVendor(companyId, vendorId),
    onSuccess: (data) => queryClient.setQueryData(companyVendorsKey(companyId), data),
  })
}

export function useUnassignCompanyVendor(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vendorId: string) => unassignCompanyVendor(companyId, vendorId),
    onSuccess: (data) => queryClient.setQueryData(companyVendorsKey(companyId), data),
  })
}
