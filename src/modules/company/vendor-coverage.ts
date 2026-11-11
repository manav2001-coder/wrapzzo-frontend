import type { CompanyVendor } from '@/api/companyVendors'

/** One vendor as the company sees it: every mapping it has, folded into where it serves. */
export interface VendorRow {
  vendorId: string
  vendorName: string
  vendorStatus: CompanyVendor['vendorStatus']
  wholeCompany: boolean
  units: { id: string; name: string }[]
}

/** The roster is one row per mapping; the page shows one row per vendor. A whole-company mapping wins over any units beside it. */
export function rowsOf(mappings: CompanyVendor[]): VendorRow[] {
  const byVendor = new Map<string, VendorRow>()
  for (const m of mappings) {
    const row = byVendor.get(m.vendorId) ?? { vendorId: m.vendorId, vendorName: m.vendorName, vendorStatus: m.vendorStatus, wholeCompany: false, units: [] }
    if (m.orgUnitId === null) row.wholeCompany = true
    else row.units.push({ id: m.orgUnitId, name: m.orgUnitName ?? '' })
    byVendor.set(m.vendorId, row)
  }
  return [...byVendor.values()].map((row) => (row.wholeCompany ? { ...row, units: [] } : row)).sort((a, b) => a.vendorName.localeCompare(b.vendorName))
}
