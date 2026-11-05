import { AppDialog } from '@/components/app-dialog'
import { OrgUnitTree } from '@/components/org-unit-tree'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { CompanyCoverage, Vendor } from '@/api/vendors'
import { useCompanyOrgUnits } from '@/hooks/useUsers'
import { useVendorCoverage } from '@/hooks/useVendors'

/** One company a vendor serves: the whole of it, or the divisions and units ticked in that company's own tree. */
function CompanySection({ coverage }: { coverage: CompanyCoverage }) {
  const whole = coverage.orgUnitIds.length === 0
  const { data: units, isLoading, isError } = useCompanyOrgUnits(coverage.companyId, !whole)
  const selected = new Set(coverage.orgUnitIds)
  // A unit under a ticked one is covered too.
  const parentOf = new Map((units ?? []).map((unit) => [unit.id, unit.parentId]))
  const isCovered = (id: string) => {
    for (let ancestor = parentOf.get(id); ancestor; ancestor = parentOf.get(ancestor)) if (selected.has(ancestor)) return true
    return false
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold">{coverage.companyName ?? 'Company'}</h3>
        {whole && <Badge variant="primary-soft">Whole company</Badge>}
      </div>
      {!whole &&
        (isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : isError ? (
          <p className="text-sm text-destructive">This company's divisions and units could not be loaded, so where the vendor serves can't be shown. Try again; if it keeps failing you may lack permission to see users.</p>
        ) : (
          <OrgUnitTree
            readOnly
            units={units ?? []}
            isChecked={(id) => selected.has(id) || isCovered(id)}
            isLocked={isCovered}
            lockedHint={(id) => (isCovered(id) ? 'included' : null)}
            onToggle={() => {}}
          />
        ))}
    </section>
  )
}

/** Where a vendor serves, across every company it is mapped to -- to look at. Platform staff do not change it; the company does. */
export function VendorMappingDialog({ vendor, onClose }: { vendor: Vendor; onClose: () => void }) {
  const { data: coverage, isLoading } = useVendorCoverage(vendor.id)
  return (
    <AppDialog
      open
      onOpenChange={(open) => !open && onClose()}
      size="md"
      title={`Where ${vendor.name} serves`}
      description={vendor.companyName ? `Added and run by ${vendor.companyName}.` : undefined}
      cancelLabel="Close"
    >
      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : !coverage || coverage.length === 0 ? (
        <p className="text-sm text-muted-foreground">This vendor is not mapped to any company yet.</p>
      ) : (
        <div className="space-y-5">
          {coverage.map((entry) => (
            <CompanySection key={entry.companyId} coverage={entry} />
          ))}
        </div>
      )}
    </AppDialog>
  )
}
