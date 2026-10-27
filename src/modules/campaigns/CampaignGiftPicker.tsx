import { Check, Gift as GiftIcon } from 'lucide-react'

import type { Gift } from '@/api/gifts'
import { EmptyState } from '@/components/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { useActiveGifts } from '@/hooks/useGifts'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'

function GiftPickerCard({ gift, selected, onToggle }: { gift: Gift; selected: boolean; onToggle: () => void }) {
  const cover = [...gift.images].sort((a, b) => a.displayOrder - b.displayOrder)[0]

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-lg border-2 bg-card text-left transition-all',
        selected ? 'border-primary shadow-md ring-2 ring-primary/20' : 'border-border hover:border-primary/40 hover:shadow-sm',
      )}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-muted">
        {cover ? (
          <img src={cover.imageUrl} alt={gift.name} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-primary/60">
            <GiftIcon className="h-8 w-8" />
          </div>
        )}
        <span
          className={cn(
            'absolute top-2 right-2 grid h-6 w-6 place-items-center rounded-full border-2 transition-colors',
            selected ? 'border-primary bg-primary text-primary-foreground' : 'border-white bg-black/20 text-transparent',
          )}
        >
          <Check className="h-3.5 w-3.5" />
        </span>
      </div>
      <div className="flex flex-col gap-0.5 p-3">
        <span className="truncate text-sm font-medium">{gift.name}</span>
        <span className="truncate text-xs text-muted-foreground">
          {gift.category}
          {gift.vendorName && ` · ${gift.vendorName}`}
        </span>
        <span className="text-xs font-semibold">{formatCurrency(gift.totalPrice)}</span>
      </div>
    </button>
  )
}

/** Pick one or more gifts a campaign offers -- each recipient later gets one of them. */
export function CampaignGiftPicker({ selectedIds, onChange }: { selectedIds: string[]; onChange: (ids: string[]) => void }) {
  const { data: gifts, isLoading } = useActiveGifts()

  function toggle(id: string) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((existing) => existing !== id) : [...selectedIds, id])
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-lg" />
        ))}
      </div>
    )
  }

  if (!gifts || gifts.length === 0) {
    return (
      <EmptyState
        icon={GiftIcon}
        title="No gifts in the catalogue yet"
        description="Ask your Wrappzo account manager to add a gift before you can launch a campaign."
      />
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {gifts.map((gift) => (
        <GiftPickerCard key={gift.id} gift={gift} selected={selectedIds.includes(gift.id)} onToggle={() => toggle(gift.id)} />
      ))}
    </div>
  )
}
