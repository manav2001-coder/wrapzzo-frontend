import type { CompanyVendor } from '@/api/companyVendors'
import type { OrgUnit } from '@/api/myOrgUnits'

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

export interface UnitNode extends OrgUnit {
  children: UnitNode[]
}

/** The org units as a tree, divisions first: a unit whose parent is missing from the list is treated as a root. */
export function unitTree(units: OrgUnit[]): UnitNode[] {
  const nodes = new Map(units.map((u) => [u.id, { ...u, children: [] as UnitNode[] }]))
  const roots: UnitNode[] = []
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  }
  const sort = (list: UnitNode[]) => {
    list.sort((a, b) => a.name.localeCompare(b.name))
    list.forEach((n) => sort(n.children))
  }
  sort(roots)
  return roots
}

/** Every unit beneath `node`, at any depth. */
export function descendantIds(node: UnitNode): string[] {
  return node.children.flatMap((child) => [child.id, ...descendantIds(child)])
}
