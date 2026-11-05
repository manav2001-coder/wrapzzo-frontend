import { useMemo } from 'react'

import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useMyOrgUnits } from '@/hooks/useMyOrgUnits'
import { descendantIds, unitTree, type UnitNode } from './vendor-coverage'

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

/** One unit and everything under it. A ticked unit covers its whole subtree, so what sits beneath it shows as included, not separately tickable. */
function UnitBranch({
  node,
  depth,
  selected,
  coveredByAncestor,
  readOnly,
  onToggle,
}: {
  node: UnitNode
  depth: number
  selected: Set<string>
  coveredByAncestor: boolean
  readOnly: boolean
  onToggle: (node: UnitNode, checked: boolean) => void
}) {
  const checked = selected.has(node.id) || coveredByAncestor
  const id = `unit-${node.id}`
  return (
    <li>
      <div className="flex items-center gap-2 py-1" style={{ paddingLeft: depth * 20 }}>
        <Checkbox id={id} checked={checked} disabled={readOnly || coveredByAncestor} onCheckedChange={(value) => onToggle(node, value === true)} />
        <Label htmlFor={id} className="flex cursor-pointer items-baseline gap-2 font-normal">
          <span className={depth === 0 ? 'font-medium' : ''}>{node.name}</span>
          <span className="text-xs text-muted-foreground">{node.levelName}</span>
          {coveredByAncestor && <span className="text-xs text-muted-foreground">· included</span>}
        </Label>
      </div>
      {node.children.length > 0 && (
        <ul>
          {node.children.map((child) => (
            <UnitBranch key={child.id} node={child} depth={depth + 1} selected={selected} coveredByAncestor={checked} readOnly={readOnly} onToggle={onToggle} />
          ))}
        </ul>
      )}
    </li>
  )
}

/** Where a vendor serves: the whole company, or divisions and units ticked from the company's own tree. */
export function CoveragePicker({ value, onChange, readOnly = false }: { value: Coverage; onChange: (value: Coverage) => void; readOnly?: boolean }) {
  const { data: orgUnits } = useMyOrgUnits()
  const tree = useMemo(() => unitTree(orgUnits ?? []), [orgUnits])

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
        <div className="max-h-64 overflow-y-auto rounded-md border p-2">
          {tree.length === 0 ? (
            <p className="p-2 text-sm text-muted-foreground">No divisions or units yet.</p>
          ) : (
            <ul>
              {tree.map((node) => (
                <UnitBranch key={node.id} node={node} depth={0} selected={value.selected} coveredByAncestor={false} readOnly={readOnly} onToggle={toggle} />
              ))}
            </ul>
          )}
        </div>
      )}
      {!readOnly && value.mode === 'units' && value.selected.size === 0 && <p className="text-xs text-muted-foreground">Tick at least one division or unit, or choose the whole company.</p>}
    </div>
  )
}
