import { ProgressSpinner } from 'primereact/progressspinner'
import { EmptyState } from '@/components/EmptyState'
import { useActiveGifts } from '@/hooks/useGifts'
import type { Gift } from '@/api/gifts'

function GiftPickerCard({ gift, selected, onToggle }: { gift: Gift; selected: boolean; onToggle: () => void }) {
  const cover = [...gift.images].sort((a, b) => a.displayOrder - b.displayOrder)[0]

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`group relative flex flex-col overflow-hidden rounded-xl border-2 bg-surface text-left transition-all ${
        selected ? 'border-accent shadow-md ring-2 ring-accent/20' : 'border-border hover:border-accent/40 hover:shadow-sm'
      }`}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-surface-muted">
        {cover ? (
          <img src={cover.imageUrl} alt={gift.name} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-text-muted">
            <i className="pi pi-image text-2xl" />
          </div>
        )}
        <div
          className={`absolute inset-0 transition-colors ${selected ? 'bg-accent/10' : 'bg-transparent group-hover:bg-black/5'}`}
        />
        <div
          className={`absolute top-2 right-2 grid h-6 w-6 place-items-center rounded-full border-2 transition-colors ${
            selected ? 'border-accent bg-accent text-white' : 'border-white bg-black/20 text-transparent'
          }`}
        >
          <i className="pi pi-check text-xs" />
        </div>
      </div>
      <div className="flex flex-col gap-0.5 p-3">
        <span className="truncate text-sm font-medium text-text">{gift.name}</span>
        <span className="truncate text-xs text-text-muted">{gift.category}</span>
      </div>
    </button>
  )
}

export function CampaignGiftPicker({ selectedIds, onChange }: { selectedIds: string[]; onChange: (ids: string[]) => void }) {
  const { data: gifts, isLoading } = useActiveGifts()

  function toggle(id: string) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((existing) => existing !== id) : [...selectedIds, id])
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <ProgressSpinner style={{ width: 32, height: 32 }} strokeWidth="4" />
      </div>
    )
  }

  if (!gifts || gifts.length === 0) {
    return (
      <EmptyState
        icon="pi-gift"
        title="No gifts in the catalogue yet"
        description="Ask your Wrapzzo account manager to add a gift before you can launch a campaign."
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
