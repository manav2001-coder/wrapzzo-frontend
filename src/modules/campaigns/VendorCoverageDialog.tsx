import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { AppDialog } from '@/components/app-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useMyOrgUnits } from '@/hooks/useMyOrgUnits'
import { useAvailableVendors, useSetMyVendorCoverage } from '@/hooks/useMyVendors'
import { descendantIds, unitTree, type UnitNode, type VendorRow } from './vendor-coverage'

/** One unit and everything under it. A ticked unit covers its whole subtree, so what sits beneath it shows as included, not separately tickable. */
function UnitBranch({
  node,
  depth,
  selected,
  coveredByAncestor,
  onToggle,
}: {
  node: UnitNode
  depth: number
  selected: Set<string>
  coveredByAncestor: boolean
  onToggle: (node: UnitNode, checked: boolean) => void
}) {
  const checked = selected.has(node.id) || coveredByAncestor
  const id = `unit-${node.id}`
  return (
    <li>
      <div className="flex items-center gap-2 py-1" style={{ paddingLeft: depth * 20 }}>
        <Checkbox id={id} checked={checked} disabled={coveredByAncestor} onCheckedChange={(value) => onToggle(node, value === true)} />
        <Label htmlFor={id} className="flex cursor-pointer items-baseline gap-2 font-normal">
          <span className={depth === 0 ? 'font-medium' : ''}>{node.name}</span>
          <span className="text-xs text-muted-foreground">{node.levelName}</span>
          {coveredByAncestor && <span className="text-xs text-muted-foreground">· included</span>}
        </Label>
      </div>
      {node.children.length > 0 && (
        <ul>
          {node.children.map((child) => (
            <UnitBranch key={child.id} node={child} depth={depth + 1} selected={selected} coveredByAncestor={checked} onToggle={onToggle} />
          ))}
        </ul>
      )}
    </li>
  )
}

/**
 * Where a vendor serves in this company: the whole company, or chosen divisions and org units. Used both to map a vendor
 * that is not on the roster yet (`vendor` omitted: pick one) and to change one that is.
 */
export function VendorCoverageDialog({ vendor, onClose }: { vendor?: VendorRow; onClose: () => void }) {
  const showError = useApiErrorToast()
  const setCoverage = useSetMyVendorCoverage()
  const { data: orgUnits } = useMyOrgUnits()
  const { data: available } = useAvailableVendors(!vendor)
  const [vendorId, setVendorId] = useState(vendor?.vendorId ?? '')
  const [mode, setMode] = useState<'whole' | 'units'>(vendor?.wholeCompany ? 'whole' : 'units')
  const [selected, setSelected] = useState<Set<string>>(new Set(vendor?.units.map((u) => u.id) ?? []))
  const tree = useMemo(() => unitTree(orgUnits ?? []), [orgUnits])

  function toggle(node: UnitNode, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current)
      if (checked) {
        next.add(node.id)
        // The unit now covers everything under it, so those need no mapping of their own.
        descendantIds(node).forEach((id) => next.delete(id))
      } else {
        next.delete(node.id)
      }
      return next
    })
  }

  const canSave = vendorId !== '' && (mode === 'whole' || selected.size > 0)

  async function onSave() {
    try {
      await setCoverage.mutateAsync({ vendorId, wholeCompany: mode === 'whole', orgUnitIds: mode === 'whole' ? [] : [...selected] })
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
      title={vendor ? `Where ${vendor.vendorName} serves` : 'Map a vendor'}
      description="Orders raised in a division or unit go only to vendors mapped to it. Tick a division to include every unit inside it."
      confirmLabel="Save mapping"
      cancelLabel="Cancel"
      confirmDisabled={!canSave}
      loading={setCoverage.isPending}
      onConfirm={() => void onSave()}
    >
      <div className="space-y-4">
        {!vendor && (
          <div className="space-y-1.5">
            <Label>Vendor</Label>
            <Select value={vendorId} onValueChange={setVendorId}>
              <SelectTrigger aria-label="Vendor">
                <SelectValue placeholder="Choose a vendor" />
              </SelectTrigger>
              <SelectContent>
                {(available ?? []).map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <RadioGroup value={mode} onValueChange={(value) => setMode(value as 'whole' | 'units')} className="gap-3">
          <div className="flex items-center gap-2">
            <RadioGroupItem value="units" id="coverage-units" />
            <Label htmlFor="coverage-units" className="font-normal">
              Specific divisions and units
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="whole" id="coverage-whole" />
            <Label htmlFor="coverage-whole" className="font-normal">
              Whole company
            </Label>
          </div>
        </RadioGroup>

        {mode === 'units' && (
          <div className="max-h-72 overflow-y-auto rounded-md border p-2">
            {tree.length === 0 ? (
              <p className="p-2 text-sm text-muted-foreground">No divisions or units yet.</p>
            ) : (
              <ul>
                {tree.map((node) => (
                  <UnitBranch key={node.id} node={node} depth={0} selected={selected} coveredByAncestor={false} onToggle={toggle} />
                ))}
              </ul>
            )}
          </div>
        )}
        {mode === 'units' && selected.size === 0 && <p className="text-xs text-muted-foreground">Tick at least one division or unit, or choose the whole company.</p>}
      </div>
    </AppDialog>
  )
}
