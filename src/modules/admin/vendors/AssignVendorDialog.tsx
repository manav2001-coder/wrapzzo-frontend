import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import type { Vendor } from '@/api/vendors'
import { AppDialog } from '@/components/app-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useAssignCompanyVendor } from '@/hooks/useCompanyVendors'
import { useCompanyOrgUnits } from '@/hooks/useUsers'
import { cn } from '@/lib/utils'

/**
 * Serve a company with vendors: tick the vendors and where they serve -- the whole company, or any
 * number of its org units (each covering everything beneath it). One mapping is made per vendor and
 * place, so the same vendor can serve several units, and other companies too. Already-mapped
 * pairs are left as they are.
 */
export function AssignVendorDialog({ companyId, vendors, onClose }: { companyId: string; vendors: Vendor[]; onClose: () => void }) {
  const { t } = useTranslation('admin')
  const showError = useApiErrorToast()
  const { data: orgUnits } = useCompanyOrgUnits(companyId)
  const assign = useAssignCompanyVendor(companyId)
  const [vendorIds, setVendorIds] = useState<Set<string>>(new Set())
  const [wholeCompany, setWholeCompany] = useState(true)
  const [unitIds, setUnitIds] = useState<Set<string>>(new Set())
  const places: (string | null)[] = [...(wholeCompany ? [null] : []), ...unitIds]

  function flip(setter: typeof setVendorIds, id: string, on: boolean) {
    setter((current) => {
      const next = new Set(current)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  }

  async function save() {
    try {
      for (const vendorId of vendorIds) {
        for (const orgUnitId of places) await assign.mutateAsync({ vendorId, orgUnitId })
      }
      toast.success(t('vendorMapping.assigned', { count: vendorIds.size * places.length }))
      onClose()
    } catch (error) {
      showError(error)
    }
  }

  const chip = (on: boolean) => cn('flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm', on && 'border-primary/40 bg-primary/5')

  return (
    <AppDialog
      open
      onOpenChange={(open) => !open && onClose()}
      size="lg"
      title={t('vendorMapping.assignTitle')}
      description={t('vendorMapping.assignHint')}
      confirmLabel={t('vendorMapping.assign')}
      confirmDisabled={vendorIds.size === 0 || places.length === 0 || assign.isPending}
      loading={assign.isPending}
      onConfirm={() => void save()}
    >
      <div className="space-y-5">
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{t('vendorMapping.vendors')}</legend>
          <div className="flex flex-wrap gap-2">
            {vendors.map((vendor) => (
              <label key={vendor.id} className={chip(vendorIds.has(vendor.id))}>
                <Checkbox aria-label={vendor.name} checked={vendorIds.has(vendor.id)} onCheckedChange={(next) => flip(setVendorIds, vendor.id, next === true)} />
                {vendor.name}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{t('vendorMapping.serves')}</legend>
          <div className="flex flex-wrap gap-2">
            <label className={chip(wholeCompany)}>
              <Checkbox aria-label={t('vendorMapping.wholeCompany')} checked={wholeCompany} onCheckedChange={(next) => setWholeCompany(next === true)} />
              {t('vendorMapping.wholeCompany')}
            </label>
            {(orgUnits ?? []).map((unit) => (
              <label key={unit.id} className={chip(unitIds.has(unit.id))}>
                <Checkbox aria-label={`${unit.levelName}: ${unit.name}`} checked={unitIds.has(unit.id)} onCheckedChange={(next) => flip(setUnitIds, unit.id, next === true)} />
                {unit.levelName}: {unit.name}
              </label>
            ))}
          </div>
        </fieldset>
      </div>
    </AppDialog>
  )
}
