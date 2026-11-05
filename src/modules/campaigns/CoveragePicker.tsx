import { useMemo } from 'react'

import { OrgUnitTree } from '@/components/org-unit-tree'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useMyOrgUnits } from '@/hooks/useMyOrgUnits'
import { descendantIds, type UnitNode } from '@/lib/org-unit-tree'

export interface Coverage {
  mode: 'whole' | 'units'
  selected: Set<string>
}

/** Serves somewhere: the whole company, or at least one division or unit. */
export const isCoverageComplete = (coverage: Coverage) => coverage.mode === 'whole' || coverage.selected.size > 0

/** What the API takes for a coverage. */
export const coverageInput = (coverage: Coverage) => ({
  wholeCompany: coverage.mode === 'whole',
  orgUnitIds: coverage.mode === 'whole' ? [] : [...coverage.selected],
})

/** Where a vendor serves: the whole company, or divisions and units ticked from the company's own tree. */
export function CoveragePicker({ value, onChange, readOnly = false }: { value: Coverage; onChange: (value: Coverage) => void; readOnly?: boolean }) {
  const { data: orgUnits } = useMyOrgUnits()
  const units = orgUnits ?? []

  // A ticked unit covers its whole subtree: what sits beneath it shows ticked, locked and "included".
  const covered = useMemo(() => {
    const parentOf = new Map(units.map((u) => [u.id, u.parentId]))
    const result = new Set<string>()
    for (const unit of units) {
      for (let ancestor = parentOf.get(unit.id); ancestor; ancestor = parentOf.get(ancestor)) {
        if (value.selected.has(ancestor)) {
          result.add(unit.id)
          break
        }
      }
    }
    return result
  }, [units, value.selected])

  function toggle(node: UnitNode, checked: boolean) {
    const next = new Set(value.selected)
    if (checked) {
      next.add(node.id)
      // The unit now covers everything under it, so those need no mapping of their own.
      descendantIds(node).forEach((id) => next.delete(id))
    } else {
      next.delete(node.id)
    }
    onChange({ ...value, selected: next })
  }

  return (
    <div className="space-y-3">
      <RadioGroup value={value.mode} onValueChange={(mode) => onChange({ ...value, mode: mode as Coverage['mode'] })} disabled={readOnly} className="gap-3">
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

      {value.mode === 'units' && (
        <OrgUnitTree
          units={units}
          isChecked={(id) => value.selected.has(id) || covered.has(id)}
          isLocked={(id) => covered.has(id)}
          lockedHint={(id) => (covered.has(id) ? 'included' : null)}
          onToggle={toggle}
          readOnly={readOnly}
        />
      )}
      {!readOnly && value.mode === 'units' && value.selected.size === 0 && <p className="text-xs text-muted-foreground">Tick at least one division or unit, or choose the whole company.</p>}
    </div>
  )
}
