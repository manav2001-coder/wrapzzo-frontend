import type { ColumnDef } from '@tanstack/react-table'
import { Camera, ChevronRight, Gift as GiftIcon, Pencil } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'

import type { Gift } from '@/api/gifts'
import { DataTable } from '@/components/data-table'
import { listEmptyBody } from '@/components/data-table/list-body'
import { IconButton } from '@/components/icon-button'
import { MasterPageHeader, StatusCell } from '@/components/masters/master-page'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useVendorGifts } from '@/hooks/useVendorGifts'
import { formatCurrency } from '@/lib/format'
import type { ListFieldMap } from '@/lib/list-fields'
import { GiftThumbnail } from '@/modules/admin/gifts/GiftThumbnail'

const LIST_FIELDS: ListFieldMap = {
  name: 'text',
  displayId: 'text',
  category: 'enum',
  price: 'number',
}

/** A product on a phone: one tap target with the name, what it earns and how fast it is made, and whether it is live. */
function VendorGiftCard({ gift }: { gift: Gift }) {
  const { t } = useTranslation('vendor')
  return (
    <Link to={`/vendor/gifts/${gift.id}`} className="flex items-center gap-3 rounded-xl border bg-card p-3.5 transition-colors active:bg-muted/60 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none">
      <GiftThumbnail gift={gift} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{gift.name}</p>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">
          {gift.displayId} · {gift.category}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="font-semibold tabular-nums">{formatCurrency(gift.price)}</span>
          {gift.leadTimeDays != null && <span className="text-muted-foreground">· {t('gifts.days', { count: gift.leadTimeDays })}</span>}
          <StatusCell active={gift.active} label={gift.active ? t('gifts.live') : t('gifts.hidden')} />
          {gift.photoRequired && (
            <Badge variant="warning-soft" className="gap-1">
              <Camera className="h-3 w-3" />
              {t('order.shipping.photo')}
            </Badge>
          )}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  )
}

/** A vendor's own products. Whether one is live in stores is Wrappzo's call, so status is shown, not toggled. */
export function VendorGiftListPage() {
  const { t } = useTranslation('vendor')
  const navigate = useNavigate()
  const { data: gifts, isLoading, error, refetch } = useVendorGifts()

  const categoryOptions = useMemo(
    () => [...new Set((gifts ?? []).map((gift) => gift.category))].sort().map((value) => ({ value, label: value })),
    [gifts],
  )

  const columns = useMemo<ColumnDef<Gift, unknown>[]>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: t('gifts.column.gift'),
        meta: { className: 'min-w-[240px]' },
        cell: ({ row }) => (
          <Link to={`/vendor/gifts/${row.original.id}`} className="flex items-center justify-center gap-2.5 font-medium hover:underline">
            <GiftThumbnail gift={row.original} />
            <span className="truncate">{row.original.name}</span>
          </Link>
        ),
      },
      { id: 'displayId', accessorKey: 'displayId', header: t('gifts.column.id'), meta: { className: 'min-w-[100px]' } },
      {
        id: 'category',
        accessorKey: 'category',
        header: t('gifts.column.category'),
        filterFn: 'equals',
        meta: { className: 'min-w-[150px]', filterVariant: 'select', filterOptions: categoryOptions },
      },
      {
        id: 'price',
        accessorKey: 'price',
        header: t('gifts.column.price'),
        enableColumnFilter: false,
        meta: { className: 'min-w-[110px]' },
        cell: ({ row }) => <span className="font-medium">{formatCurrency(row.original.price)}</span>,
      },
      {
        id: 'leadTimeDays',
        accessorKey: 'leadTimeDays',
        header: t('gifts.column.leadTime'),
        enableColumnFilter: false,
        meta: { className: 'min-w-[100px]' },
        cell: ({ row }) => (row.original.leadTimeDays != null ? t('gifts.days', { count: row.original.leadTimeDays }) : '—'),
      },
      {
        id: 'needs',
        header: t('gifts.column.needs'),
        enableColumnFilter: false,
        enableSorting: false,
        meta: { className: 'min-w-[170px]' },
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.photoRequired && (
              <Badge variant="warning-soft" className="gap-1">
                <Camera className="h-3 w-3" />
                {t('order.shipping.photo')}
              </Badge>
            )}
            {!row.original.photoRequired && <span className="text-muted-foreground">—</span>}
          </div>
        ),
      },
      {
        id: 'active',
        accessorKey: 'active',
        header: t('gifts.column.status'),
        enableColumnFilter: false,
        meta: { className: 'min-w-[110px]' },
        cell: ({ row }) =>
          row.original.active ? (
            <StatusCell active label={t('gifts.live')} />
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0}>
                  <StatusCell active={false} label={t('gifts.hidden')} />
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">{t('gifts.hiddenHelp')}</TooltipContent>
            </Tooltip>
          ),
      },
      {
        id: 'actions',
        header: '',
        enableColumnFilter: false,
        enableSorting: false,
        meta: { className: 'w-[56px]', pin: 'right' },
        cell: ({ row }) => <IconButton icon={Pencil} label={row.original.name} onClick={() => navigate(`/vendor/gifts/${row.original.id}`)} />,
      },
    ],
    [t, categoryOptions, navigate],
  )

  return (
    <div>
      <MasterPageHeader
        title={t('gifts.title')}
        description={t('gifts.subtitle')}
        createLabel={t('gifts.add')}
        onCreate={() => navigate('/vendor/gifts/new')}
      />
      <DataTable<Gift>
        columns={columns}
        data={gifts ?? []}
        isLoading={isLoading}
        listFields={LIST_FIELDS}
        searchable
        showRowSelectionColumn={false}
        renderMobileCard={(gift) => <VendorGiftCard gift={gift} />}
        getRowId={(gift) => gift.id}
        tableId="vendor-gifts"
        configNamespace="vendor-gifts"
        emptyState={listEmptyBody({
          error,
          onRetry: () => void refetch(),
          icon: <GiftIcon className="h-8 w-8 opacity-50" />,
          message: t('gifts.emptyTitle'),
          description: t('gifts.emptyBody'),
        })}
      />
    </div>
  )
}
