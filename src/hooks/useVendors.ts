import { useQuery } from '@tanstack/react-query'
import { getVendorCoverage, listVendors } from '@/api/vendors'

const vendorsKey = ['vendors'] as const

/** All vendors across every franchise, or -- with a company -- the ones serving it. Read-only: companies run their own. */
export function useVendors(companyId?: string | null) {
  return useQuery({ queryKey: [...vendorsKey, companyId ?? 'all'], queryFn: () => listVendors(companyId) })
}

export function useVendorCoverage(id: string | undefined) {
  return useQuery({ queryKey: ['vendor-coverage', id], queryFn: () => getVendorCoverage(id!), enabled: Boolean(id) })
}
