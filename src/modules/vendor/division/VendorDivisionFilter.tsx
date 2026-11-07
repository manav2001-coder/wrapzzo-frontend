import { Layers } from 'lucide-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useMyVendorDivisions, useVendorOrderDivisions } from '@/hooks/useVendorOrders'
import { ALL_DIVISIONS, mergeDivisions, setVendorDivision, useVendorDivision } from '@/lib/vendor-division'

/**
 * Narrows the whole vendor portal -- home, orders -- to one of the customer's divisions. It offers every division the vendor is
 * mapped to serve, not only those an order has come from, and appears once there are two or more to choose between.
 */
export function VendorDivisionFilter({ className }: { className?: string }) {
  const { t } = useTranslation('vendor')
  const { data: fromOrders, isSuccess: ordersLoaded } = useVendorOrderDivisions()
  const { data: served, isSuccess: servedLoaded } = useMyVendorDivisions()
  const division = useVendorDivision()
  const options = mergeDivisions(served ?? [], fromOrders ?? [])
  const known = options.some((option) => option.id === division)

  // A saved choice the vendor no longer serves would show an empty portal with no way back: clear it.
  useEffect(() => {
    if (ordersLoaded && servedLoaded && division !== ALL_DIVISIONS && !known) setVendorDivision(ALL_DIVISIONS)
  }, [ordersLoaded, servedLoaded, division, known])

  if (options.length < 2) return null
  const value = known ? division : ALL_DIVISIONS

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
