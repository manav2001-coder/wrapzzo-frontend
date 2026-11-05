import { Layers } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAllVendorOrders } from '@/hooks/useVendorOrders'
import { ALL_DIVISIONS, divisionsOf, setVendorDivision, useVendorDivision } from '@/lib/vendor-division'

/**
 * Narrows the whole vendor portal -- home, orders -- to one of the customer's divisions. It only appears for a vendor
 * whose orders come from two or more divisions; a vendor serving a single division has nothing to choose.
 */
export function VendorDivisionFilter({ className }: { className?: string }) {
  const { t } = useTranslation('vendor')
  const { data: orders } = useAllVendorOrders()
  const division = useVendorDivision()
  const options = divisionsOf(orders ?? [])
  if (options.length < 2) return null
  const value = options.some((option) => option.id === division) ? division : ALL_DIVISIONS

  return (
    <div className={className}>
      <Select value={value} onValueChange={setVendorDivision}>
        <SelectTrigger aria-label={t('division.label')} className="w-56 bg-background">
          <Layers className="mr-1.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_DIVISIONS}>{t('division.all')}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name} ({option.count})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
