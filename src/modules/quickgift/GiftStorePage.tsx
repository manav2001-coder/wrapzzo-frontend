import { Button } from 'primereact/button'
import { Dropdown } from 'primereact/dropdown'
import { IconField } from 'primereact/iconfield'
import { InputIcon } from 'primereact/inputicon'
import { InputText } from 'primereact/inputtext'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Gift } from '@/api/gifts'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { useActiveGifts } from '@/hooks/useGifts'
import { useHasAccess } from '@/hooks/use-permission'
import { formatCurrency } from '@/lib/format'

function GiftCard({ gift, canQuickGift, canLaunchCampaign }: { gift: Gift; canQuickGift: boolean; canLaunchCampaign: boolean }) {
  const navigate = useNavigate()
  const image = gift.images[0]?.imageUrl

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-muted">
        {image ? (
          <img src={image} alt={gift.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
        ) : (
          <div className="grid h-full w-full place-items-center text-text-muted">
            <i className="pi pi-gift text-3xl" />
          </div>
        )}
        <span className="absolute top-2 left-2 rounded-full bg-surface/90 px-2 py-0.5 text-xs font-medium text-text shadow-sm backdrop-blur-sm">
          {gift.category}
        </span>
        {gift.totalPrice != null && (
          <span className="absolute right-2 bottom-2 rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-white shadow-sm">
            {formatCurrency(gift.totalPrice)}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="font-semibold text-text">{gift.name}</p>
        {gift.description && <p className="line-clamp-2 text-xs text-text-muted">{gift.description}</p>}
        {gift.leadTimeDays != null && (
          <p className="flex items-center gap-1 text-xs text-text-muted">
            <i className="pi pi-clock" /> Lead time: {gift.leadTimeDays}d
          </p>
        )}

        <div className="mt-auto flex flex-wrap gap-2 pt-2">
          {canQuickGift && (
            <Button
              label="Quick Gift"
              icon="pi pi-bolt"
              size="small"
              outlined
              onClick={() => navigate(`/quick-gift/new/${gift.id}`)}
            />
          )}
          {canLaunchCampaign && (
            <Button
              label="Launch Campaign"
              icon="pi pi-megaphone"
              size="small"
              onClick={() => navigate('/campaigns/new', { state: { initialGiftId: gift.id } })}
            />
          )}
          {!canQuickGift && !canLaunchCampaign && <span className="text-xs text-text-muted">Not available to you right now.</span>}
        </div>
      </div>
    </div>
  )
}

export function GiftStorePage() {
  const { data: gifts, isLoading } = useActiveGifts()
  const canQuickGift = useHasAccess('quickgift.create')
  const canLaunchCampaign = useHasAccess('campaign.manage')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>('ALL')

  const categories = useMemo(() => {
    const set = new Set((gifts ?? []).map((g) => g.category))
    return ['ALL', ...Array.from(set).sort()]
  }, [gifts])

  const filtered = useMemo(() => {
    return (gifts ?? []).filter((g) => {
      if (category !== 'ALL' && g.category !== category) return false
      const q = search.trim().toLowerCase()
      if (!q) return true
      return g.name.toLowerCase().includes(q) || g.category.toLowerCase().includes(q) || (g.description ?? '').toLowerCase().includes(q)
    })
  }, [gifts, search, category])

  return (
    <div>
      <PageHeader
        title="Gift Store"
        subtitle="Every gift Wrapzzo has curated and made available to your company. Send one instantly with Quick Gift, or coordinate a larger initiative with a Campaign."
      />

      {!isLoading && (gifts ?? []).length === 0 ? (
        <EmptyState icon="pi-gift" title="No gifts available yet" description="Your Wrapzzo account manager hasn't added any gifts to the catalogue yet." />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <IconField iconPosition="left">
              <InputIcon className="pi pi-search" />
              <InputText value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search gifts..." className="w-full sm:w-72" />
            </IconField>
            <Dropdown
              value={category}
              onChange={(e) => setCategory(e.value)}
              options={categories.map((c) => ({ label: c === 'ALL' ? 'All categories' : c, value: c }))}
              className="w-full sm:w-56"
            />
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-64 animate-pulse rounded-2xl bg-surface-muted" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState icon="pi-search" title="No gifts match your search" />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {filtered.map((gift) => (
                <GiftCard key={gift.id} gift={gift} canQuickGift={canQuickGift} canLaunchCampaign={canLaunchCampaign} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
