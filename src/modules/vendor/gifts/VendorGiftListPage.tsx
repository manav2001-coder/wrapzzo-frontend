import type { ColumnDef } from '@tanstack/react-table'
import { Camera, Gift as GiftIcon, Palette, Pencil } from 'lucide-react'
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

/** A vendor's own products. Whether one is live in stores is Wrapzzo's call, so status is shown, not toggled. */
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
        meta: { className: 'min-w-[240px]', align: 'left' },
        cell: ({ row }) => (
          <Link to={`/vendor/gifts/${row.original.id}`} className="flex items-center gap-2.5 font-medium hover:underline">
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
        meta: { className: 'min-w-[110px]', align: 'right' },
        cell: ({ row }) => <span className="font-medium">{formatCurrency(row.original.price)}</span>,
      },
      {
        id: 'leadTimeDays',
        accessorKey: 'leadTimeDays',
        header: t('gifts.column.leadTime'),
        enableColumnFilter: false,
        meta: { className: 'min-w-[100px]', align: 'right' },
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
            {row.original.artworkRequired && (
              <Badge variant="primary-soft" className="gap-1">
                <Palette className="h-3 w-3" />
                {t('stage.artwork')}
              </Badge>
            )}
            {row.original.photoRequired && (
              <Badge variant="warning-soft" className="gap-1">
                <Camera className="h-3 w-3" />
                {t('order.shipping.photo')}
              </Badge>
            )}
            {!row.original.artworkRequired && !row.original.photoRequired && <span className="text-muted-foreground">—</span>}
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
