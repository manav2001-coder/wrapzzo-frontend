import type { ColumnDef } from '@tanstack/react-table'
import { CheckCircle2, Cog, Eye, Palette, ShoppingBag, Truck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import type { Order, OrderStatus } from '@/api/orders'
import { AppTabs } from '@/components/app-tabs'
import { DataTable } from '@/components/data-table'
import { listEmptyBody } from '@/components/data-table/list-body'
import { IconButton } from '@/components/icon-button'
import { MasterPageHeader } from '@/components/masters/master-page'
import { ArtworkReview } from '@/components/orders/artwork-review'
import { OrderDetailSheet } from '@/components/orders/order-detail-sheet'
import { OrderStatusBadge } from '@/components/orders/order-status'
import { PhotoLinkDialog, type PhotoLinkPrompt } from '@/components/orders/photo-link-dialog'
import { StatCard } from '@/components/stat-card'
import { Badge } from '@/components/ui/badge'
import { useMenuLabel } from '@/hooks/use-menu-labels'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useHasAccess } from '@/hooks/use-permission'
import { P } from '@/lib/permissions'
import { useOrders, useRequestOrderPhotoLink } from '@/hooks/useOrders'
import { formatDate } from '@/lib/datetime'
import { formatCurrency } from '@/lib/format'
import type { ListFieldMap } from '@/lib/list-fields'

const LIST_FIELDS: ListFieldMap = {
  displayId: 'text',
  giftName: 'text',
  recipientName: 'text',
  assignedVendorName: 'text',
  orgUnitName: 'text',
  quantity: 'number',
  totalPrice: 'number',
  status: 'enum',
}

const STATUSES: OrderStatus[] = [
  'PROCESSING',
  'PRODUCTION_QUEUE',
  'DISPATCHED',
  'RECEIVED_AT_WAREHOUSE',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
]

type Tab = 'all' | 'review'

/**
 * The company's orders -- within the user's org scope -- and the reviewer's side of the artwork
 * loop: orders whose newest proof waits on them get their own tab, and an order's sheet carries
 * the proof with Approve / Request changes. Refreshes on its own, so a vendor's upload shows up.
 */
export function OrdersPage() {
  const { t } = useTranslation('orders')
  const pageTitle = useMenuLabel('company-orders', t('company.title'))
  const showError = useApiErrorToast()
  const canReview = useHasAccess(P.ORDER_ARTWORK_REVIEW)
  const { data: orders, isLoading, error, refetch } = useOrders()
  const requestPhotoLink = useRequestOrderPhotoLink()

  const [tab, setTab] = useState<Tab>('all')
  const [openId, setOpenId] = useState<string | null>(null)
  const [photoPrompt, setPhotoPrompt] = useState<PhotoLinkPrompt | null>(null)
  // Kept by id so the sheet follows the list as it refreshes.
  const open = orders?.find((order) => order.id === openId) ?? null

  const list = orders ?? []
  const needsReview = list.filter((order) => order.hasPendingDesignReview)
  const count = (status: OrderStatus) => list.filter((order) => order.status === status).length
  const visible = tab === 'review' ? needsReview : list

  async function sendPhotoLink(order: Order) {
    try {
      const result = await requestPhotoLink.mutateAsync(order.id)
      toast.success(t('detail.linkSent'))
      setPhotoPrompt({ link: result.recipientUploadUrl, recipientName: order.recipientName, phone: order.recipientPhone })
    } catch (err) {
      showError(err)
    }
  }

  const columns = useMemo<ColumnDef<Order, unknown>[]>(
    () => [
      {
        id: 'giftName',
        accessorFn: (order) => order.giftName ?? '',
        header: t('column.gift'),
        meta: { className: 'min-w-[220px]' },
        cell: ({ row }) => (
          <button type="button" className="flex min-w-0 items-center justify-center gap-2.5" onClick={() => setOpenId(row.original.id)}>
            {row.original.giftImageUrl ? (
              <img src={row.original.giftImageUrl} alt="" className="h-9 w-9 shrink-0 rounded-md border object-cover" />
            ) : (
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                <ShoppingBag className="h-4 w-4" />
              </span>
            )}
            <span className="min-w-0">
              <span className="block truncate font-medium hover:underline">{row.original.giftName ?? row.original.displayId}</span>
              <span className="block text-xs text-muted-foreground">{row.original.displayId}</span>
            </span>
          </button>
        ),
      },
      {
        id: 'recipientName',
        accessorFn: (order) => order.recipientName ?? '',
        header: t('column.recipient'),
        meta: { className: 'min-w-[160px]' },
      },
      {
        id: 'quantity',
        accessorKey: 'quantity',
        header: t('column.quantity'),
        enableColumnFilter: false,
        meta: { className: 'min-w-[70px]' },
      },
      {
        id: 'assignedVendorName',
        accessorFn: (order) => order.assignedVendorName ?? '',
        header: t('column.vendor'),
        meta: { className: 'min-w-[150px]' },
        cell: ({ row }) => row.original.assignedVendorName ?? <span className="text-muted-foreground">{t('unassigned')}</span>,
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: t('column.status'),
        filterFn: 'equals',
        meta: {
          className: 'min-w-[190px]',
          filterVariant: 'select',
          filterOptions: STATUSES.map((value) => ({ value, label: t(`status.${value}`) })),
        },
        cell: ({ row }) => (
          <span className="flex flex-wrap items-center justify-center gap-1.5">
            <OrderStatusBadge status={row.original.status} />
            {row.original.hasPendingDesignReview && (
              <Badge variant="primary-soft" className="gap-1 whitespace-nowrap">
                <Eye className="h-3 w-3" />
                {t('needsReview')}
              </Badge>
            )}
          </span>
        ),
      },
      {
        id: 'orgUnitName',
        accessorFn: (order) => order.orgUnitName ?? '',
        header: t('column.orgUnit'),
        meta: { className: 'min-w-[120px]' },
      },
      {
        id: 'totalPrice',
        accessorKey: 'totalPrice',
        header: t('column.total'),
        enableColumnFilter: false,
        meta: { className: 'min-w-[110px]' },
        cell: ({ row }) => formatCurrency(row.original.totalPrice),
      },
      {
        id: 'createdAt',
        accessorKey: 'createdAt',
        header: t('column.placed'),
        enableColumnFilter: false,
        meta: { className: 'min-w-[110px]' },
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
      {
        id: 'actions',
        header: '',
        enableColumnFilter: false,
        enableSorting: false,
        meta: { className: 'w-[56px]', pin: 'right' },
        cell: ({ row }) => (
          <IconButton icon={Eye} label={t('detail.title', { id: row.original.displayId })} onClick={() => setOpenId(row.original.id)} />
        ),
      },
    ],
    [t],
  )

  return (
    <div>
      <MasterPageHeader title={pageTitle} description={t('company.subtitle')} />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {canReview && (
          <StatCard
            title={t('company.stats.review')}
            value={needsReview.length}
            icon={Palette}
            color={needsReview.length > 0 ? 'primary' : 'default'}
            loading={isLoading}
            active={tab === 'review'}
            onClick={() => setTab(tab === 'review' ? 'all' : 'review')}
          />
        )}
        <StatCard title={t('company.stats.production')} value={count('PRODUCTION_QUEUE')} icon={Cog} color="warning" loading={isLoading} />
        <StatCard title={t('company.stats.dispatched')} value={count('DISPATCHED')} icon={Truck} color="primary" loading={isLoading} />
        <StatCard title={t('company.stats.delivered')} value={count('DELIVERED')} icon={CheckCircle2} color="success" loading={isLoading} />
      </div>

      {canReview && (
        <AppTabs
          value={tab}
          onValueChange={(value) => setTab(value as Tab)}
          className="mb-3"
          tabs={[
            { value: 'all', label: t('company.tabAll'), badge: list.length || undefined },
            { value: 'review', label: t('company.tabReview'), badge: needsReview.length || undefined },
          ]}
        />
      )}

      <DataTable<Order>
        columns={columns}
        data={visible}
        isLoading={isLoading}
        listFields={LIST_FIELDS}
        searchable
        showRowSelectionColumn={false}
        defaultSort={{ id: 'createdAt', desc: true }}
        getRowId={(order) => order.id}
        tableId="company-orders"
        configNamespace="company-orders"
        emptyState={listEmptyBody({
          error,
          onRetry: () => void refetch(),
          icon: <ShoppingBag className="h-8 w-8 opacity-50" />,
          message: tab === 'review' ? t('company.reviewEmptyTitle') : t('company.emptyTitle'),
          description: tab === 'review' ? t('company.reviewEmptyBody') : t('company.emptyBody'),
        })}
      />

      <OrderDetailSheet
        order={open}
        onClose={() => setOpenId(null)}
        onRequestPhotoLink={(order) => void sendPhotoLink(order)}
        requestingPhotoLink={requestPhotoLink.isPending}
        actions={open && canReview ? <ArtworkReview orderId={open.id} artworkRequired={open.artworkRequired} /> : undefined}
      />
      <PhotoLinkDialog prompt={photoPrompt} onClose={() => setPhotoPrompt(null)} />
    </div>
  )
}
