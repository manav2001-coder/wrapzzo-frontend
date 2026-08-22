import { Button } from 'primereact/button'
import { IconField } from 'primereact/iconfield'
import { InputIcon } from 'primereact/inputicon'
import { InputText } from 'primereact/inputtext'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Gift } from '@/api/gifts'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { useGifts } from '@/hooks/useGifts'

function GiftCard({ gift, onClick }: { gift: Gift; onClick: () => void }) {
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
          <StatusBadge status={gift.active ? 'ACTIVE' : 'INACTIVE'} label={gift.active ? 'In stock' : 'Out of stock'} />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3.5">
        <span className="truncate font-medium text-text">{gift.name}</span>
        <span className="truncate text-xs text-text-muted">{gift.category}</span>
        {gift.moq && <span className="text-xs text-text-muted">MOQ {gift.moq}</span>}
        {gift.vendorName && (
          <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5 text-[11px] text-text-muted">
            <i className="pi pi-truck text-[10px]" />
            {gift.vendorName}
          </span>
        )}
      </div>
    </button>
  )
}

export function GiftListPage() {
  const { data: gifts, isLoading } = useGifts()
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const filtered = useMemo(() => {
    if (!gifts) return []
    const query = search.trim().toLowerCase()
    if (!query) return gifts
    return gifts.filter((gift) => gift.name.toLowerCase().includes(query) || gift.category.toLowerCase().includes(query))
  }, [gifts, search])

  return (
    <div>
      <PageHeader
        title="Gift Store"
        subtitle="The shared catalogue every company browses when sending a gift."
        actions={<Button label="Add gift" icon="pi pi-plus" onClick={() => navigate('/admin/gifts/new')} />}
      />

      <div className="mb-4">
        <IconField iconPosition="left">
          <InputIcon className="pi pi-search" />
          <InputText
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search gifts"
            className="w-full sm:w-80"
          />
        </IconField>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, index) => (
            <div key={index} className="aspect-[3/4] animate-pulse rounded-xl bg-surface-muted" />
          ))}
        </div>
      ) : gifts?.length === 0 ? (
        <EmptyState
          icon="pi-gift"
          title="No gifts yet"
          description="Add your first gift to start building the catalogue companies browse from."
          action={<Button label="Add gift" icon="pi pi-plus" onClick={() => navigate('/admin/gifts/new')} />}
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon="pi-search" title="No gifts match your search" />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((gift) => (
            <GiftCard key={gift.id} gift={gift} onClick={() => navigate(`/admin/gifts/${gift.id}`)} />
          ))}
        </div>
      )}
    </div>
  )
}
