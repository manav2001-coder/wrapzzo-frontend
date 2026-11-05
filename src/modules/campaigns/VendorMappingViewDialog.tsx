import { AppDialog } from '@/components/app-dialog'
import { CoveragePicker } from './CoveragePicker'
import type { VendorRow } from './vendor-coverage'

/** Where one of the company's vendors serves, to look at: the whole company, or the divisions and units ticked in the company's tree. */
export function VendorMappingViewDialog({ vendor, onClose }: { vendor: VendorRow; onClose: () => void }) {
  return (
    <AppDialog
      open
      onOpenChange={(open) => !open && onClose()}
      size="md"
      title={`Where ${vendor.vendorName} serves`}
      description="Orders raised in a ticked division or unit, or anywhere inside it, can go to this vendor."
      cancelLabel="Close"
    >
      <CoveragePicker
        readOnly
        value={{ mode: vendor.wholeCompany ? 'whole' : 'units', selected: new Set(vendor.units.map((u) => u.id)) }}
        onChange={() => {}}
      />
    </AppDialog>
  )
}
