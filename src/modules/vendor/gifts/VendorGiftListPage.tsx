import { Button } from 'primereact/button'
import { useNavigate } from 'react-router-dom'
import type { Gift } from '@/api/gifts'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { useVendorGifts } from '@/hooks/useVendorGifts'

function VendorGiftCard({ gift, onClick }: { gift: Gift; onClick: () => void }) {
  const cover = [...gift.images].sort((a, b) => a.displayOrder - b.displayOrder)[0]

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface text-left transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-surface-muted">
        {cover ? (
          <img
            src={cover.imageUrl}
            alt={gift.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-text-muted">
            <i className="pi pi-image text-2xl" />
          </div>
        )}
        <div className="absolute top-2 left-2">
          <StatusBadge status={gift.active ? 'ACTIVE' : 'INACTIVE'} label={gift.active ? 'Listed' : 'Delisted'} />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3.5">
        <span className="truncate font-medium text-text">{gift.name}</span>
        <span className="truncate text-xs text-text-muted">{gift.category}</span>
        {gift.moq && <span className="text-xs text-text-muted">MOQ {gift.moq}</span>}
      </div>
    </button>
  )
}

export function VendorGiftListPage() {
  const { data: gifts, isLoading } = useVendorGifts()
  const navigate = useNavigate()

  return (
    <div>
      <PageHeader
        title="Gifts"
        subtitle="Gifts you've submitted to the Wrapzzo catalogue."
        actions={<Button label="Add gift" icon="pi pi-plus" onClick={() => navigate('/vendor/gifts/new')} />}
      />

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="aspect-[3/4] animate-pulse rounded-xl bg-surface-muted" />
          ))}
        </div>
      ) : gifts?.length === 0 ? (
        <EmptyState
          icon="pi-gift"
          title="No gifts yet"
          description="Add your first gift to submit it to the Wrapzzo catalogue."
          action={<Button label="Add gift" icon="pi pi-plus" onClick={() => navigate('/vendor/gifts/new')} />}
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {gifts?.map((gift) => (
            <VendorGiftCard key={gift.id} gift={gift} onClick={() => navigate(`/vendor/gifts/${gift.id}`)} />
          ))}
        </div>
      )}
    </div>
  )
}
