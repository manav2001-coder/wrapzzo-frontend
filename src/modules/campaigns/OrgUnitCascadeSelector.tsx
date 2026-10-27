import { ArrowDown, Network } from 'lucide-react'
import clsx from 'clsx'
import { useMemo } from 'react'

import { Checkbox } from '@/components/ui/checkbox'

export interface OrgUnitOption {
  id: string
  name: string
  levelName: string
  parentId: string | null
}

function buildParentIndex(orgUnits: OrgUnitOption[]): Map<string | null, OrgUnitOption[]> {
  const byParent = new Map<string | null, OrgUnitOption[]>()
  for (const unit of orgUnits) {
    const bucket = byParent.get(unit.parentId)
    if (bucket) bucket.push(unit)
    else byParent.set(unit.parentId, [unit])
  }
  for (const bucket of byParent.values()) bucket.sort((a, b) => a.name.localeCompare(b.name))
  return byParent
}

function collectWithDescendants(id: string, byParent: Map<string | null, OrgUnitOption[]>, into: Set<string>) {
  into.add(id)
  for (const child of byParent.get(id) ?? []) collectWithDescendants(child.id, byParent, into)
}

/**
 * A checked node with no checked child covers its whole subtree (findSelfAndDescendants
 * on the backend already expands it) -- so only the topmost checked node in each branch
 * needs to become an ORG_UNIT audience row. Checking a specific child narrows a branch
 * down to just that child, which is why a checked-with-checked-children node drops out here.
 */
export function computeOrgUnitFrontier(selected: Set<string>, orgUnits: OrgUnitOption[]): string[] {
  const byParent = buildParentIndex(orgUnits)
  const frontier: string[] = []
  for (const id of selected) {
    const children = byParent.get(id) ?? []
    if (!children.some((child) => selected.has(child.id))) frontier.push(id)
  }
  return frontier
}

function groupByParent(nodes: OrgUnitOption[]): Map<string | null, OrgUnitOption[]> {
  const groups = new Map<string | null, OrgUnitOption[]>()
  for (const node of nodes) {
    const bucket = groups.get(node.parentId)
    if (bucket) bucket.push(node)
    else groups.set(node.parentId, [node])
  }
  return groups
}

export function OrgUnitCascadeSelector({
  orgUnits,
  selected,
  onChange,
  disabled,
}: {
  orgUnits: OrgUnitOption[]
  selected: Set<string>
  onChange: (next: Set<string>) => void
  disabled?: boolean
}) {
  const byParent = useMemo(() => buildParentIndex(orgUnits), [orgUnits])
  const byId = useMemo(() => new Map(orgUnits.map((u) => [u.id, u])), [orgUnits])

  const levels = useMemo(() => {
    const result: OrgUnitOption[][] = []
    let parents: (string | null)[] = [null]
    while (true) {
      const nodes = parents.flatMap((p) => byParent.get(p) ?? [])
      if (nodes.length === 0) break
      result.push(nodes)
      parents = nodes.filter((n) => selected.has(n.id)).map((n) => n.id)
      if (parents.length === 0) break
    }
    return result
  }, [byParent, selected])

  const frontierCount = useMemo(() => computeOrgUnitFrontier(selected, orgUnits).length, [selected, orgUnits])

  function toggleNode(id: string, checked: boolean) {
    const next = new Set(selected)
    if (checked) {
      next.add(id)
    } else {
      const toRemove = new Set<string>()
      collectWithDescendants(id, byParent, toRemove)
      toRemove.forEach((r) => next.delete(r))
    }
    onChange(next)
  }

  function toggleLevel(nodes: OrgUnitOption[], checked: boolean) {
    const next = new Set(selected)
    for (const node of nodes) {
      if (checked) {
        next.add(node.id)
      } else {
        const toRemove = new Set<string>()
        collectWithDescendants(node.id, byParent, toRemove)
        toRemove.forEach((r) => next.delete(r))
      }
    }
    onChange(next)
  }

  if (orgUnits.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border p-4 text-sm text-muted-foreground">
        This company doesn't have an org hierarchy yet — import employees with org levels to target by unit.
      </div>
    )
  }

  return (
    <div className="rounded-lg border border bg-card p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Network className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Target by org unit</p>
            <p className="text-xs text-muted-foreground">Check a whole branch, or drill down for finer control.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {frontierCount > 0 && (
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
              {frontierCount} unit{frontierCount === 1 ? '' : 's'} selected
            </span>
          )}
          {frontierCount > 0 && !disabled && (
            <button type="button" className="text-xs text-muted-foreground hover:text-primary hover:underline" onClick={() => onChange(new Set())}>
              Clear all
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col">
        {levels.map((nodes, depth) => {
          const allChecked = nodes.every((n) => selected.has(n.id))
          const groups = groupByParent(nodes)
          const showGroupHeaders = depth > 0 && groups.size > 1

          return (
            <div key={depth}>
              {depth > 0 && (
                <div className="flex justify-center py-1">
                  <ArrowDown className="h-3 w-3 text-muted-foreground/40" />
                </div>
              )}
              <div className="rounded-lg border border p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
                      {depth + 1}
                    </span>
                    <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{nodes[0]?.levelName ?? `Level ${depth + 1}`}</span>
                  </div>
                  {!disabled && nodes.length > 1 && (
                    <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                      <Checkbox checked={allChecked} onCheckedChange={(checked) => toggleLevel(nodes, checked === true)} />
                      Select all
                    </label>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  {[...groups.entries()].map(([parentId, groupNodes]) => (
                    <div key={parentId ?? 'root'}>
                      {showGroupHeaders && (
                        <p className="mb-1 text-[11px] text-muted-foreground">
                          Under <span className="font-medium text-foreground">{parentId ? (byId.get(parentId)?.name ?? '') : ''}</span>
                        </p>
                      )}
                      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
                        {groupNodes.map((node) => {
                          const checked = selected.has(node.id)
                          return (
                            <label
                              key={node.id}
                              className={clsx(
                                'flex min-w-0 cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 text-sm transition-colors',
                                checked ? 'border-primary/30 bg-primary/5 text-foreground' : 'border-transparent text-foreground hover:bg-muted',
                              )}
                            >
                              <Checkbox checked={checked} disabled={disabled} onCheckedChange={(next) => toggleNode(node.id, next === true)} />
                              <span className="truncate">{node.name}</span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
