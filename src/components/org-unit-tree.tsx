import { ChevronRight, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { branchIds, descendantIds, filterTree, unitTree, type TreeUnit, type UnitNode } from '@/lib/org-unit-tree'
import { cn } from '@/lib/utils'

/** Up to this many units the tree opens fully; beyond it only the branches holding something ticked open, so a big company is not a wall. */
const OPEN_ALL_UP_TO = 12

interface OrgUnitTreeProps {
  units: TreeUnit[]
  /** Ticked, whether chosen or covered by a unit above it. */
  isChecked: (id: string) => boolean
  /** Shown ticked but not changeable here (covered by a unit above it, or the person's own). */
  isLocked: (id: string) => boolean
  /** A short reason beside a locked unit, e.g. "included". */
  lockedHint?: (id: string) => string | null
  onToggle: (node: UnitNode, checked: boolean) => void
  readOnly?: boolean
  emptyText?: string
}

function Branch({
  node,
  depth,
  open,
  searching,
  onOpenChange,
  props,
}: {
  node: UnitNode
  depth: number
  open: Set<string>
  searching: boolean
  onOpenChange: (id: string, open: boolean) => void
  props: OrgUnitTreeProps
}) {
  const { isChecked, isLocked, lockedHint, onToggle, readOnly } = props
  const hasChildren = node.children.length > 0
  const expanded = searching || open.has(node.id)
  const below = useMemo(() => descendantIds(node), [node])
  const tickedBelow = below.filter((id) => isChecked(id)).length
  const hint = lockedHint?.(node.id)
  const checkboxId = `org-unit-${node.id}`

  return (
    <li>
      <div className={cn('group flex items-center gap-1 rounded-lg pr-2 transition-colors hover:bg-muted/60', depth === 0 && 'bg-muted/30')}>
        {hasChildren ? (
          <button
            type="button"
            aria-label={`${expanded ? 'Collapse' : 'Expand'} ${node.name}`}
            aria-expanded={expanded}
            onClick={() => onOpenChange(node.id, !expanded)}
            className="grid h-8 w-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className={cn('h-4 w-4 transition-transform', expanded && 'rotate-90')} />
          </button>
        ) : (
          <span className="h-8 w-7 shrink-0" />
        )}
        <Checkbox
          id={checkboxId}
          checked={isChecked(node.id)}
          disabled={readOnly || isLocked(node.id)}
          onCheckedChange={(value) => onToggle(node, value === true)}
        />
        <label htmlFor={checkboxId} className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 py-1.5 pl-1.5 text-sm">
          <span className={cn('truncate', depth === 0 && 'font-semibold')}>{node.name}</span>
          <span className="shrink-0 rounded-full border px-1.5 py-px text-[10px] font-medium tracking-wide text-muted-foreground uppercase">{node.levelName}</span>
          {hint && <span className="shrink-0 text-xs text-muted-foreground">· {hint}</span>}
        </label>
        {hasChildren && (
          <span className={cn('shrink-0 text-xs tabular-nums', tickedBelow > 0 ? 'font-medium text-primary' : 'text-muted-foreground')}>
            {tickedBelow > 0 ? `${tickedBelow} of ${below.length}` : below.length}
          </span>
        )}
      </div>
      {hasChildren && expanded && (
        <ul className="ml-[13px] border-l border-border/70 pl-2">
          {node.children.map((child) => (
            <Branch key={child.id} node={child} depth={depth + 1} open={open} searching={searching} onOpenChange={onOpenChange} props={props} />
          ))}
        </ul>
      )}
    </li>
  )
}

/**
 * The company's divisions and units as a tree you can open and close, search, and tick -- what a person or a vendor
 * covers. Each branch shows how many units sit beneath it and how many of them are ticked, so a closed division still
 * says what is inside it.
 */
function LoadedTree(props: OrgUnitTreeProps) {
  const { units, isChecked } = props
  const roots = useMemo(() => unitTree(units), [units])
  const allBranches = useMemo(() => branchIds(roots), [roots])
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<Set<string>>(() => {
    if (units.length <= OPEN_ALL_UP_TO) return new Set(allBranches)
    // Open the path to everything already ticked.
    const parentOf = new Map(units.map((u) => [u.id, u.parentId]))
    const opened = new Set<string>()
    for (const unit of units) {
      if (!isChecked(unit.id)) continue
      for (let parent = parentOf.get(unit.id); parent; parent = parentOf.get(parent)) opened.add(parent)
    }
    return opened
  })
  const visible = useMemo(() => filterTree(roots, query), [roots, query])
  const searching = query.trim() !== ''
  const ticked = units.filter((u) => isChecked(u.id)).length

  function setBranch(id: string, expand: boolean) {
    setOpen((current) => {
      const next = new Set(current)
      if (expand) next.add(id)
      else next.delete(id)
      return next
    })
  }

  return (
    <div className="rounded-xl border">
      <div className="flex flex-wrap items-center gap-2 border-b p-2">
        <div className="relative min-w-[160px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search divisions and units" aria-label="Search divisions and units" className="h-8 pr-7 pl-8 text-sm" />
          {query && (
            <button type="button" aria-label="Clear search" onClick={() => setQuery('')} className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {allBranches.length > 0 && (
          <div className="flex shrink-0 gap-1 text-xs">
            <button type="button" onClick={() => setOpen(new Set(allBranches))} className="rounded-md px-2 py-1 font-medium text-primary hover:bg-primary/10">
              Expand all
            </button>
            <button type="button" onClick={() => setOpen(new Set())} className="rounded-md px-2 py-1 font-medium text-muted-foreground hover:bg-muted">
              Collapse all
            </button>
          </div>
        )}
      </div>
      <div className="max-h-72 overflow-y-auto p-1.5">
        {visible.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">Nothing matches “{query.trim()}”.</p>
        ) : (
          <ul className="space-y-0.5">
            {visible.map((node) => (
              <Branch key={node.id} node={node} depth={0} open={open} searching={searching} onOpenChange={setBranch} props={props} />
            ))}
          </ul>
        )}
      </div>
      <div className="border-t px-3 py-1.5 text-xs text-muted-foreground">
        {ticked === 0 ? 'Nothing ticked' : `${ticked} of ${units.length} ticked`}
      </div>
    </div>
  )
}

export function OrgUnitTree(props: OrgUnitTreeProps) {
  // Mounted only once there are units, so which branches start open is decided from the real list, not from the empty one before it loads.
  if (props.units.length === 0) return <p className="rounded-lg border p-3 text-sm text-muted-foreground">{props.emptyText ?? 'No divisions or units yet.'}</p>
  return <LoadedTree {...props} />
}
