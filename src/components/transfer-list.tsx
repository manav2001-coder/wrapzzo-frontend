import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export interface TransferItem {
  id: string
  label: string
  /** Secondary text: a module, a status. */
  hint?: string
}

interface PanelProps {
  title: string
  items: TransferItem[]
  empty: string
  searchLabel: string
  actionLabel: string
  actionIcon: 'add' | 'remove'
  disabled: boolean
  onAction: (ids: string[]) => void
}

function Panel({ title, items, empty, searchLabel, actionLabel, actionIcon, disabled, onAction }: PanelProps) {
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return needle ? items.filter((item) => `${item.label} ${item.hint ?? ''}`.toLowerCase().includes(needle)) : items
  }, [items, query])
  // Only ids still on offer count: an item that moved across is no longer picked.
  const chosen = shown.filter((item) => picked.has(item.id)).map((item) => item.id)

  function toggle(id: string, on: boolean) {
    setPicked((current) => {
      const next = new Set(current)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  }

  return (
    <div className="flex min-h-[18rem] flex-col rounded-md border">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <span className="text-sm font-medium">
          {title} <span className="text-muted-foreground">({items.length})</span>
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={disabled || chosen.length === 0}
          onClick={() => {
            onAction(chosen)
            setPicked(new Set())
          }}
        >
          {actionIcon === 'remove' && <ArrowLeft />}
          {actionLabel} {chosen.length > 0 && `(${chosen.length})`}
          {actionIcon === 'add' && <ArrowRight />}
        </Button>
      </div>
      <div className="border-b p-2">
        <Input aria-label={searchLabel} placeholder={searchLabel} value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <ul className="max-h-80 flex-1 divide-y overflow-y-auto">
        {shown.length === 0 ? (
          <li className="p-4 text-sm text-muted-foreground">{empty}</li>
        ) : (
          shown.map((item) => (
            <li key={item.id}>
              <label className={cn('flex items-center gap-2 px-3 py-1.5 text-sm', disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-muted/50')}>
                <Checkbox aria-label={item.label} checked={picked.has(item.id)} disabled={disabled} onCheckedChange={(next) => toggle(item.id, next === true)} />
                <span className="flex-1">{item.label}</span>
                {item.hint && <span className="text-xs text-muted-foreground">{item.hint}</span>}
              </label>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}

/**
 * Two lists -- what is on offer and what is assigned -- with a button each way. The caller owns
 * the data: `onAdd` / `onRemove` receive the ticked ids and are expected to persist, after which
 * the lists the caller passes in change. Used by every TBAC assignment screen.
 */
export function TransferList({
  available,
  assigned,
  onAdd,
  onRemove,
  disabled = false,
  availableTitle,
  assignedTitle,
  searchLabel,
  addLabel,
  removeLabel,
  emptyAvailable,
  emptyAssigned,
}: {
  available: TransferItem[]
  assigned: TransferItem[]
  onAdd: (ids: string[]) => void
  onRemove: (ids: string[]) => void
  disabled?: boolean
  availableTitle: string
  assignedTitle: string
  searchLabel: string
  addLabel: string
  removeLabel: string
  emptyAvailable: string
  emptyAssigned: string
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Panel title={availableTitle} items={available} empty={emptyAvailable} searchLabel={`${searchLabel}: ${availableTitle}`} actionLabel={addLabel} actionIcon="add" disabled={disabled} onAction={onAdd} />
      <Panel title={assignedTitle} items={assigned} empty={emptyAssigned} searchLabel={`${searchLabel}: ${assignedTitle}`} actionLabel={removeLabel} actionIcon="remove" disabled={disabled} onAction={onRemove} />
    </div>
  )
}
