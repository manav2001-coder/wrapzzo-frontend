import { Camera, Clock, Gift as GiftIcon, Palette, Search } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import type { Gift } from '@/api/gifts'
import { EmptyState } from '@/components/empty-state'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/format'

const ALL = '__all__'

/** One catalogue tile: cover, price, name, vendor and what the gift needs -- `actions` is the caller's footer. */
export function GiftCard({ gift, actions }: { gift: Gift; actions?: ReactNode }) {
  const { t } = useTranslation('gifts')
  const cover = [...gift.images].sort((a, b) => a.displayOrder - b.displayOrder)[0]

  return (
    <article className="group flex flex-col overflow-hidden rounded-lg border bg-card shadow-sm transition-shadow hover:shadow-md">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {cover ? (
          <img src={cover.imageUrl} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="grid h-full w-full place-items-center bg-primary/5 text-primary/60">
            <GiftIcon className="h-10 w-10" />
          </div>
        )}
        <Badge variant="secondary" className="absolute top-2 left-2 bg-background/90 backdrop-blur-sm">
          {gift.category}
        </Badge>
        {gift.totalPrice != null && (
          <span className="absolute right-2 bottom-2 rounded-md bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground shadow-sm">
            {formatCurrency(gift.totalPrice)}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        <h3 className="line-clamp-1 text-sm font-semibold">{gift.name}</h3>
        {gift.vendorName && <p className="text-xs text-muted-foreground">{t('catalogue.by', { vendor: gift.vendorName })}</p>}
        {gift.description && <p className="line-clamp-2 text-xs text-muted-foreground">{gift.description}</p>}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {gift.leadTimeDays != null && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              {t('catalogue.leadTime', { days: gift.leadTimeDays })}
            </span>
          )}
          {gift.artworkRequired && (
            <Badge variant="primary-soft" className="gap-1 text-[10px]">
              <Palette className="h-3 w-3" />
              {t('catalogue.personalised')}
            </Badge>
          )}
          {gift.photoRequired && (
            <Badge variant="warning-soft" className="gap-1 text-[10px]">
              <Camera className="h-3 w-3" />
              {t('catalogue.needsPhoto')}
            </Badge>
          )}
        </div>
        {actions && <div className="mt-auto flex flex-wrap gap-2 pt-2.5">{actions}</div>}
      </div>
    </article>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: string[]
  allLabel: string
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className="w-full sm:w-52">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/**
 * The browsable catalogue shared by the Gift Store and Quick Gift: search, category and vendor
 * filters over a responsive grid. Picking a vendor's gift is picking that vendor, so the vendor
 * filter appears as soon as more than one vendor serves the user.
 */
export function GiftCatalogue({
  gifts,
  isLoading,
  renderActions,
}: {
  gifts: Gift[] | undefined
  isLoading: boolean
  renderActions: (gift: Gift) => ReactNode
}) {
  const { t } = useTranslation('gifts')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState(ALL)
  const [vendor, setVendor] = useState(ALL)

  const categories = useMemo(() => [...new Set((gifts ?? []).map((g) => g.category))].sort(), [gifts])
  const vendors = useMemo(
    () => [...new Set((gifts ?? []).map((g) => g.vendorName).filter((name): name is string => Boolean(name)))].sort(),
    [gifts],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (gifts ?? []).filter((g) => {
      if (category !== ALL && g.category !== category) return false
      if (vendor !== ALL && g.vendorName !== vendor) return false
      if (!q) return true
      return [g.name, g.category, g.description ?? '', g.vendorName ?? ''].some((text) => text.toLowerCase().includes(q))
    })
  }, [gifts, search, category, vendor])

  if (!isLoading && (gifts ?? []).length === 0) {
    return <EmptyState icon={GiftIcon} title={t('catalogue.emptyTitle')} description={t('catalogue.emptyBody')} />
  }

  return (
    <div className="frame-free flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('catalogue.search')}
            aria-label={t('catalogue.search')}
            className="pl-8"
          />
        </div>
        <FilterSelect
          label={t('catalogue.category')}
          value={category}
          onChange={setCategory}
          options={categories}
          allLabel={t('catalogue.allCategories')}
        />
        {vendors.length > 1 && (
          <FilterSelect label={t('catalogue.vendor')} value={vendor} onChange={setVendor} options={vendors} allLabel={t('catalogue.allVendors')} />
        )}
        {!isLoading && <span className="ml-auto text-xs text-muted-foreground">{t('catalogue.count', { count: filtered.length })}</span>}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Search} title={t('catalogue.noMatchTitle')} description={t('catalogue.noMatchBody')} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((gift) => (
            <GiftCard key={gift.id} gift={gift} actions={renderActions(gift)} />
          ))}
        </div>
      )}
    </div>
  )
}
