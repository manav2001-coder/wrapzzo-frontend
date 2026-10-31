import { useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { CheckCircle2, Cog, Eye, Palette, ShoppingBag, Truck, TriangleAlert, Wand2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { assignOrderVendor, autoAssignOrderVendor, type Order } from '@/api/orders'
import { AppDialog } from '@/components/app-dialog'
import { DataTable } from '@/components/data-table'
import { listEmptyBody } from '@/components/data-table/list-body'
import { Combobox } from '@/components/fields/combobox'
import { IconButton } from '@/components/icon-button'
import { MasterPageHeader } from '@/components/masters/master-page'
import { useCompanyScope } from '@/components/masters/company-scope-select'
import { OrderDetailSheet } from '@/components/orders/order-detail-sheet'
import { OrderStatusBadge } from '@/components/orders/order-status'
import { PhotoLinkDialog, type PhotoLinkPrompt } from '@/components/orders/photo-link-dialog'
import { StatCard } from '@/components/stat-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { usePlatformOrders, useRequestPlatformOrderPhotoLink } from '@/hooks/useOrders'
import { useVendors } from '@/hooks/useVendors'
import { formatDate } from '@/lib/datetime'
import { formatCurrency } from '@/lib/format'
import type { ListFieldMap } from '@/lib/list-fields'

const LIST_FIELDS: ListFieldMap = {
  displayId: 'text',
  companyName: 'text',
  campaignName: 'text',
  recipientName: 'text',
  giftName: 'text',
  assignedVendorName: 'text',
  status: 'enum',
  totalPrice: 'number',
  createdAt: 'date',
}

/** A vendor can only be (re)assigned while the order is still in the vendor's hands. */
const assignable = (order: Order) => order.status === 'PROCESSING' || order.status === 'PRODUCTION_QUEUE'

/**
 * Every company's orders, and the one fulfilment action Wrappzo staff take on them: routing each
 * to a vendor -- one at a time from its row, or many at once by selecting rows. Auto-assign prefers
 * the vendor who submitted the gift, else the least-loaded active vendor (decided by the backend).
 */
export function OrdersPage() {
  const { t } = useTranslation('orders')
  const queryClient = useQueryClient()
  const showError = useApiErrorToast()
  const { data: allOrders, isLoading, error, refetch } = usePlatformOrders()
  // The company scope (first company by default), as everywhere else platform staff work per company.
  const scope = useCompanyScope()
  const companyId = scope.companyId
  const orders = useMemo(() => (companyId ? (allOrders ?? []).filter((order) => order.companyId === companyId) : []), [allOrders, companyId])
  const { data: vendors } = useVendors()
  const requestPhotoLink = useRequestPlatformOrderPhotoLink()

  const [openOrderId, setOpenOrderId] = useState<string | null>(null)
  const [assigning, setAssigning] = useState<Order[] | null>(null)
  const [vendorId, setVendorId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [photoPrompt, setPhotoPrompt] = useState<PhotoLinkPrompt | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const openOrder = orders?.find((order) => order.id === openOrderId) ?? null
  const vendorOptions = useMemo(
    () => (vendors ?? []).filter((vendor) => vendor.status === 'ACTIVE').map((vendor) => ({ value: vendor.id, label: vendor.name })),
    [vendors],
  )

  const counts = useMemo(() => {
    const list = orders ?? []
    return {
      total: list.length,
      unassigned: list.filter((order) => !order.assignedVendorId && order.status !== 'CANCELLED').length,
      production: list.filter((order) => order.status === 'PRODUCTION_QUEUE').length,
      delivered: list.filter((order) => order.status === 'DELIVERED').length,
    }
  }, [orders])

  /** Runs one call per order, best-effort like the backend's own bulk assign, then refreshes once. */
  async function runForEach(targets: Order[], call: (order: Order) => Promise<unknown>, key: 'assigned' | 'autoAssigned') {
    setBusy(true)
    const results = await Promise.allSettled(targets.map(call))
    setBusy(false)
    await queryClient.invalidateQueries({ queryKey: ['platform-orders'] })
    setRefreshTrigger((n) => n + 1)
    const done = results.filter((result) => result.status === 'fulfilled').length
    const failed = results.length - done
    if (done > 0) toast.success(t(`platform.${key}`, { count: done }), failed ? { description: t('platform.skipped', { count: failed }) } : undefined)
    else if (failed) showError((results.find((result) => result.status === 'rejected') as PromiseRejectedResult).reason)
  }

  async function assign() {
    if (!assigning || !vendorId) return
    await runForEach(assigning, (order) => assignOrderVendor(order.id, vendorId), 'assigned')
    setAssigning(null)
  }

  async function sendPhotoLink(order: Order) {
    try {
      const { recipientUploadUrl } = await requestPhotoLink.mutateAsync(order.id)
      toast.success(t('detail.linkSent'))
      setPhotoPrompt({ link: recipientUploadUrl, recipientName: order.recipientName, phone: order.recipientPhone })
    } catch (err) {
      showError(err)
    }
  }

  const columns = useMemo<ColumnDef<Order, unknown>[]>(
    () => [
      {
        id: 'displayId',
        accessorKey: 'displayId',
        header: t('column.order'),
        meta: { className: 'min-w-[120px]' },
        cell: ({ row }) => (
          <button type="button" className="font-medium hover:underline" onClick={() => setOpenOrderId(row.original.id)}>
            {row.original.displayId}
          </button>
        ),
      },
      { id: 'companyName', accessorKey: 'companyName', header: t('column.company'), meta: { className: 'min-w-[160px]' } },
      {
        id: 'campaignName',
        accessorFn: (order) => order.campaignName ?? t(`source.${order.source}`),
        header: t('column.campaign'),
        meta: { className: 'min-w-[170px]' },
      },
      { id: 'recipientName', accessorFn: (order) => order.recipientName ?? '', header: t('column.recipient'), meta: { className: 'min-w-[160px]' } },
      {
        id: 'giftName',
        accessorFn: (order) => order.giftName ?? '',
        header: t('column.gift'),
        meta: { className: 'min-w-[180px]', align: 'left' },
        cell: ({ row }) => (
          <span className="flex items-center gap-2">
            <span className="truncate">{row.original.giftName ?? '-'}</span>
            {row.original.hasPendingDesignReview && (
              <Palette className="h-3.5 w-3.5 shrink-0 text-warning" aria-label={t('needsReview')} />
            )}
          </span>
        ),
      },
      {
        id: 'totalPrice',
        accessorKey: 'totalPrice',
        header: t('column.total'),
        enableColumnFilter: false,
        meta: { className: 'min-w-[110px]', align: 'right' },
        cell: ({ row }) => formatCurrency(row.original.totalPrice),
      },
      {
        id: 'assignedVendorName',
        accessorFn: (order) => order.assignedVendorName ?? '',
        header: t('column.vendor'),
        meta: { className: 'min-w-[170px]' },
        cell: ({ row }) =>
          row.original.assignedVendorName ? (
            <span className="flex items-center gap-1.5">
              <span className="truncate">{row.original.assignedVendorName}</span>
              {row.original.assignmentMode === 'AUTO' && <Badge variant="outline">{t('auto')}</Badge>}
            </span>
          ) : (
            <span className="text-muted-foreground">{t('unassigned')}</span>
          ),
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: t('column.status'),
        filterFn: 'equals',
        meta: {
          className: 'min-w-[130px]',
          filterVariant: 'select',
          filterOptions: (['PROCESSING', 'PRODUCTION_QUEUE', 'DISPATCHED', 'DELIVERED', 'CANCELLED'] as const).map((value) => ({
            value,
            label: t(`status.${value}`),
          })),
        },
        cell: ({ row }) => <OrderStatusBadge status={row.original.status} />,
      },
      {
        id: 'createdAt',
        accessorKey: 'createdAt',
        header: t('column.placed'),
        enableColumnFilter: false,
        meta: { className: 'min-w-[120px]' },
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
      {
        id: 'actions',
        header: t('field.actions', { ns: 'common' }),
        enableColumnFilter: false,
        enableSorting: false,
        meta: { className: 'min-w-[120px]', pin: 'right' },
        cell: ({ row }) => {
          const order = row.original
          return (
            <div className="flex items-center justify-end gap-0.5">
              <IconButton icon={Eye} label={t('detail.title', { id: order.displayId })} onClick={() => setOpenOrderId(order.id)} />
              {assignable(order) && (
                <>
                  <IconButton
                    icon={Wand2}
                    label={t('platform.autoAssign')}
                    onClick={() => void runForEach([order], (o) => autoAssignOrderVendor(o.id), 'autoAssigned')}
                  />
                  <IconButton
                    icon={Truck}
                    label={order.assignedVendorId ? t('platform.reassign') : t('platform.assign')}
                    onClick={() => {
                      setVendorId(order.assignedVendorId)
                      setAssigning([order])
                    }}
                  />
                </>
              )}
            </div>
          )
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t],
  )

  return (
    <div className="space-y-4">
      <MasterPageHeader title={t('platform.title')} description={t('platform.subtitle')} extra={scope.control} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard title={t('platform.stats.total')} value={counts.total} icon={ShoppingBag} loading={isLoading} />
        <StatCard
          title={t('platform.stats.unassigned')}
          value={counts.unassigned}
          icon={TriangleAlert}
          color={counts.unassigned > 0 ? 'destructive' : undefined}
          loading={isLoading}
        />
        <StatCard title={t('platform.stats.production')} value={counts.production} icon={Cog} loading={isLoading} />
        <StatCard title={t('platform.stats.delivered')} value={counts.delivered} icon={CheckCircle2} loading={isLoading} />
      </div>

      <DataTable<Order>
        columns={columns}
        data={orders ?? []}
        isLoading={isLoading}
        listFields={LIST_FIELDS}
        searchable
        refreshTrigger={refreshTrigger}
        defaultSort={{ id: 'createdAt', desc: true }}
        getRowId={(order) => order.id}
        getRowCanSelect={assignable}
        tableId="platform-orders"
        configNamespace="platform-orders"
        renderBulkActions={(_options, selected) =>
          selected.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => void runForEach(selected, (order) => autoAssignOrderVendor(order.id), 'autoAssigned')}
              >
                <Wand2 />
                {t('platform.autoAssignSelected')}
              </Button>
              <Button
                size="sm"
                disabled={busy}
                onClick={() => {
                  setVendorId(null)
                  setAssigning(selected)
                }}
              >
                <Truck />
                {t('platform.assignSelected')}
              </Button>
            </div>
          )
        }
        emptyState={listEmptyBody({
          error,
          onRetry: () => void refetch(),
          icon: <ShoppingBag className="h-8 w-8 opacity-50" />,
          message: t('platform.emptyTitle'),
          description: t('platform.emptyBody'),
        })}
      />

      <AppDialog
        open={assigning !== null}
        onOpenChange={(open) => !open && setAssigning(null)}
        size="sm"
        title={t('platform.assignTitle')}
        description={assigning ? t('platform.assignBody', { count: assigning.length }) : undefined}
        confirmLabel={t('platform.assign')}
        cancelLabel={t('action.cancel', { ns: 'common' })}
        confirmDisabled={!vendorId}
        loading={busy}
        onConfirm={assign}
      >
        <div className="space-y-1.5">
          <Label htmlFor="assign-vendor">{t('column.vendor')}</Label>
          <Combobox
            id="assign-vendor"
            options={vendorOptions}
            displayValue={(option) => option.label}
            getOptionKey={(option) => option.value}
            value={vendorOptions.find((option) => option.value === vendorId) ?? null}
            placeholder={t('platform.pickVendor')}
            onChange={(next) => setVendorId((next as { value: string } | null)?.value ?? null)}
          />
        </div>
      </AppDialog>

      <OrderDetailSheet
        order={openOrder}
        onClose={() => setOpenOrderId(null)}
        onRequestPhotoLink={(order) => void sendPhotoLink(order)}
        requestingPhotoLink={requestPhotoLink.isPending}
      />
      <PhotoLinkDialog prompt={photoPrompt} onClose={() => setPhotoPrompt(null)} />
    </div>
  )
}
