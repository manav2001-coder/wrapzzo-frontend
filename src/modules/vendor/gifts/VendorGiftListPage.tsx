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
import { useVendorGifts } from '@/hooks/useVendorGifts'
import { formatCurrency } from '@/lib/format'

function VendorGiftCard({ gift, onClick }: { gift: Gift; onClick: () => void }) {
  const cover = [...gift.images].sort((a, b) => a.displayOrder - b.displayOrder)[0]

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface text-left transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5"
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
        <span className="text-sm font-semibold text-text">{formatCurrency(gift.totalPrice)}</span>
        {gift.moq && <span className="text-xs text-text-muted">MOQ {gift.moq}</span>}
      </div>
    </button>
  )
}

export function VendorGiftListPage() {
  const { data: gifts, isLoading } = useVendorGifts()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LISTED' | 'DELISTED'>('ALL')

  const filtered = useMemo(() => {
    return (gifts ?? []).filter((gift) => {
      if (statusFilter === 'LISTED' && !gift.active) return false
      if (statusFilter === 'DELISTED' && gift.active) return false
      const q = search.trim().toLowerCase()
      if (!q) return true
      return gift.name.toLowerCase().includes(q) || gift.category.toLowerCase().includes(q)
    })
  }, [gifts, search, statusFilter])

  return (
    <div>
      <PageHeader
        title="Gifts"
        subtitle="Gifts you've submitted to the Wrapzzo catalogue."
        actions={<Button label="Add gift" icon="pi pi-plus" onClick={() => navigate('/vendor/gifts/new')} />}
      />

      {!isLoading && gifts?.length === 0 ? (
        <EmptyState
          icon="pi-gift"
          title="No gifts yet"
          description="Add your first gift to submit it to the Wrapzzo catalogue."
          action={<Button label="Add gift" icon="pi pi-plus" onClick={() => navigate('/vendor/gifts/new')} />}
        />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <IconField iconPosition="left">
              <InputIcon className="pi pi-search" />
              <InputText
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search gifts"
                className="w-full sm:w-72"
              />
            </IconField>
            <div className="inline-flex flex-wrap gap-1 rounded-xl border border-border bg-surface p-1">
              {(['ALL', 'LISTED', 'DELISTED'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-lg border-none px-2.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
                    statusFilter === s ? 'bg-accent text-white' : 'bg-transparent text-text-muted hover:text-text'
                  }`}
                >
                  {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="aspect-[3/4] animate-pulse rounded-xl bg-surface-muted" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState icon="pi-search" title="No gifts match" />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map((gift) => (
                <VendorGiftCard key={gift.id} gift={gift} onClick={() => navigate(`/vendor/gifts/${gift.id}`)} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
