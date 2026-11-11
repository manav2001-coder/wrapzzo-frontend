import { useState } from 'react'
import { toast } from 'sonner'

import { AppDialog } from '@/components/app-dialog'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useSetMyVendorCoverage } from '@/hooks/useMyVendors'
import { CoveragePicker, coverageInput, isCoverageComplete, type Coverage } from './CoveragePicker'
import type { VendorRow } from './vendor-coverage'

/** Where one of the company's vendors serves: the whole company, or chosen divisions and org units. */
export function VendorCoverageDialog({ vendor, onClose }: { vendor: VendorRow; onClose: () => void }) {
  const showError = useApiErrorToast()
  const setCoverage = useSetMyVendorCoverage()
  const [coverage, setCoverageState] = useState<Coverage>({
    mode: vendor.wholeCompany ? 'whole' : 'units',
    selected: new Set(vendor.units.map((u) => u.id)),
  })

  async function onSave() {
    try {
      await setCoverage.mutateAsync({ vendorId: vendor.vendorId, ...coverageInput(coverage) })
      toast.success('Vendor mapping saved')
      onClose()
    } catch (err) {
      showError(err, 'The vendor mapping was not saved.')
    }
  }

  return (
    <AppDialog
      open
      onOpenChange={(open) => !open && onClose()}
      size="md"
      title={`Where ${vendor.vendorName} serves`}
      description="Orders raised in a division or unit go only to vendors mapped to it. Tick a division to include every unit inside it."
      confirmLabel="Save mapping"
      cancelLabel="Cancel"
      confirmDisabled={!isCoverageComplete(coverage)}
      loading={setCoverage.isPending}
      onConfirm={() => void onSave()}
    >
      <CoveragePicker value={coverage} onChange={setCoverageState} />
    </AppDialog>
  )
}
