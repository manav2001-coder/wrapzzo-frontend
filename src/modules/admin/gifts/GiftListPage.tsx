import type { ColumnDef } from '@tanstack/react-table'
import { Gift as GiftIcon } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import type { Gift } from '@/api/gifts'
import { DataTable } from '@/components/data-table'
import { listEmptyBody } from '@/components/data-table/list-body'
import { MasterPageHeader, useMasterColumns } from '@/components/masters/master-page'
import { Badge } from '@/components/ui/badge'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useGifts, useSetGiftStatus } from '@/hooks/useGifts'
import { formatCurrency } from '@/lib/format'
import type { ListFieldMap } from '@/lib/list-fields'
import { GiftThumbnail } from './GiftThumbnail'
import { P } from '@/lib/permissions'

const LIST_FIELDS: ListFieldMap = {
  name: 'text',
  displayId: 'text',
  category: 'enum',
  vendorName: 'text',
  price: 'number',
  totalPrice: 'number',
}

export function GiftListPage() {
  const { t } = useTranslation('admin')
  const navigate = useNavigate()
  const showError = useApiErrorToast()
  const { data: gifts, isLoading, error, refetch } = useGifts()
  const setStatus = useSetGiftStatus()

  async function changeStatus(gift: Gift, active: boolean) {
    try {
      await setStatus.mutateAsync({ id: gift.id, active })
      toast.success(active ? t('gifts.markedIn') : t('gifts.markedOut'))
    } catch (err) {
      showError(err)
    }
  }

  const { statusColumn, actionsColumn, deactivateDialog } = useMasterColumns<Gift>({
    isActive: (gift) => gift.active,
    statusLabels: { active: t('gifts.inStock'), inactive: t('gifts.outOfStock') },
    onEdit: (gift) => navigate(`/admin/gifts/${gift.id}`),
    onActivate: (gift) => changeStatus(gift, true),
    onDeactivate: (gift) => changeStatus(gift, false),
    editPermission: P.PLATFORM_PRODUCT_STATUS,
    deletePermission: P.PLATFORM_PRODUCT_STATUS,
    deactivateCopy: { label: t('gifts.markOut'), title: t('gifts.outTitle'), body: t('gifts.outBody') },
  })

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
          <Link to={`/admin/gifts/${row.original.id}`} className="flex items-center gap-2.5 font-medium hover:underline">
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
        meta: { className: 'min-w-[160px]', filterVariant: 'select', filterOptions: categoryOptions },
      },
      {
        id: 'vendorName',
        accessorFn: (gift) => gift.vendorName ?? t('gifts.wrapzzo'),
        header: t('gifts.column.vendor'),
        meta: { className: 'min-w-[160px]' },
      },
      {
        id: 'price',
        accessorKey: 'price',
        header: t('gifts.column.price'),
        enableColumnFilter: false,
        meta: { className: 'min-w-[120px]', align: 'right' },
        cell: ({ row }) => formatCurrency(row.original.price),
      },
      {
        id: 'totalPrice',
        accessorKey: 'totalPrice',
        header: t('gifts.column.total'),
        enableColumnFilter: false,
        meta: { className: 'min-w-[120px]', align: 'right' },
        cell: ({ row }) => <span className="font-semibold">{formatCurrency(row.original.totalPrice)}</span>,
      },
      {
        id: 'photoRequired',
        accessorKey: 'photoRequired',
        header: t('gifts.column.photo'),
        enableColumnFilter: false,
        meta: { className: 'min-w-[100px]' },
        cell: ({ row }) => (row.original.photoRequired ? <Badge variant="secondary">{t('gifts.photoRequired')}</Badge> : '-'),
      },
      statusColumn,
      actionsColumn,
    ],
    [t, categoryOptions, statusColumn, actionsColumn],
  )

  return (
    <div>
      <MasterPageHeader
        title={t('gifts.title')}
        description={t('gifts.subtitle')}
        createLabel={t('gifts.add')}
        createPermission={P.PLATFORM_PRODUCT_CREATE}
        onCreate={() => navigate('/admin/gifts/new')}
      />
      <DataTable<Gift>
        columns={columns}
        data={gifts ?? []}
        isLoading={isLoading}
        listFields={LIST_FIELDS}
        searchable
        showRowSelectionColumn={false}
        tableId="admin-gifts"
        configNamespace="admin-gifts"
        getRowId={(gift) => gift.id}
        emptyState={listEmptyBody({
          error,
          onRetry: () => void refetch(),
          icon: <GiftIcon className="h-8 w-8 opacity-50" />,
          message: t('gifts.emptyTitle'),
          description: t('gifts.emptyBody'),
        })}
      />
      {deactivateDialog}
    </div>
  )
}
