import type { ColumnDef } from '@tanstack/react-table'
import { ArrowRight, Palette, ShoppingBag } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'

import type { VendorOrder } from '@/api/vendorOrders'
import { AppTabs } from '@/components/app-tabs'
import { DataTable } from '@/components/data-table'
import { EmptyTable } from '@/components/data-table/empty-table'
import { MasterPageHeader } from '@/components/masters/master-page'
import { Button } from '@/components/ui/button'
import type { FetchOptions, FetchResult } from '@/components/data-table/types'
import { divisionFilter, useVendorOrderSummary, VENDOR_ORDERS_PATH } from '@/hooks/useVendorOrders'
import { LIVE_REFRESH_MS } from '@/lib/live-refresh'
import type { ListFilter } from '@/lib/list-filter'
import { serverFetcher } from '@/lib/server-list'
import { useVendorDivision } from '@/lib/vendor-division'
import { vendorApiClient } from '@/lib/vendorApiClient'
import { formatDate } from '@/lib/datetime'
import type { ListFieldMap } from '@/lib/list-fields'
import { VENDOR_STAGES, vendorStageOf, type VendorStage } from '@/lib/vendor-order-stage'
import { VendorDivisionFilter } from '../division/VendorDivisionFilter'
import { VendorStageBadge } from './VendorStageBadge'

const LIST_FIELDS: ListFieldMap = {
  displayId: 'text',
  companyName: 'text',
  giftName: 'text',
  recipientName: 'text',
  quantity: 'number',
  assignedAt: 'date',
}

const ALL = 'all'

type Row = VendorOrder & { stage: VendorStage }

/**
 * The vendor's work queue: every order routed to them, in tabs by what it needs next (artwork,
 * review, dispatch…). The tab lives in the URL (`?stage=`) so the home page can link straight to
 * one. Opening an order goes to its own workspace.
 */
export function VendorOrdersPage() {
  const { t } = useTranslation('vendor')
  const [params, setParams] = useSearchParams()
  // The figures are counted by the server over all of the vendor's orders (in the picked division); the table is one page at a time.
  const { data: summary } = useVendorOrderSummary()
  const division = useVendorDivision()
  const counts = summary?.byStage ?? {}

  const requested = params.get('stage')
  const tab = requested && (VENDOR_STAGES as string[]).includes(requested) ? requested : ALL
  // Rework and cancelled only earn a tab when something is in them -- an empty "Cancelled" is noise.
  const stages = VENDOR_STAGES.filter((stage) => (stage !== 'rework' && stage !== 'cancelled') || (counts[stage] ?? 0) > 0 || stage === tab)

  const fetchOrders = useMemo(() => {
    const fixed: ListFilter[] = [...(tab === ALL ? [] : [{ field: 'stage', operator: 'equals' as const, value: tab }]), ...divisionFilter(division)]
    const page = serverFetcher<VendorOrder>(VENDOR_ORDERS_PATH, fixed, {}, vendorApiClient)
    return async (options: FetchOptions): Promise<FetchResult<Row>> => {
      const result = await page(options)
      return { ...result, rows: result.rows.map((order) => ({ ...order, stage: vendorStageOf(order) })) }
    }
  }, [tab, division])

  const columns = useMemo<ColumnDef<Row, unknown>[]>(
    () => [
      {
        id: 'displayId',
        accessorKey: 'displayId',
        header: t('orders.column.order'),
        meta: { className: 'min-w-[110px]' },
        cell: ({ row }) => (
          <Link to={`/vendor/orders/${row.original.id}`} className="font-medium text-primary hover:underline">
            {row.original.displayId}
          </Link>
        ),
      },
      {
        id: 'giftName',
        accessorFn: (row) => row.giftName ?? '',
        header: t('orders.column.product'),
        meta: { className: 'min-w-[180px]' },
      },
      { id: 'companyName', accessorKey: 'companyName', header: t('orders.column.company'), meta: { className: 'min-w-[150px]' } },
      {
        id: 'recipientName',
        accessorFn: (row) => row.recipientName ?? '',
        header: t('orders.column.recipient'),
        meta: { className: 'min-w-[160px]' },
      },
      {
        id: 'quantity',
        accessorKey: 'quantity',
        header: t('orders.column.quantity'),
        enableColumnFilter: false,
        meta: { className: 'min-w-[70px]' },
      },
      {
        id: 'stage',
        accessorKey: 'stage',
        header: t('orders.column.stage'),
        enableColumnFilter: false,
        meta: { className: 'min-w-[150px]' },
        cell: ({ row }) => <VendorStageBadge stage={row.original.stage} />,
      },
      {
        id: 'artwork',
        accessorFn: (row) => row.designVersions,
        header: t('orders.column.artwork'),
        enableColumnFilter: false,
        meta: { className: 'min-w-[110px]' },
        cell: ({ row }) =>
          row.original.designVersions > 0 ? (
            <span className="inline-flex items-center gap-1 text-xs">
              <Palette className="h-3.5 w-3.5 text-muted-foreground" />
              {t('orders.versions', { count: row.original.designVersions })}
              {row.original.latestDesignStatus && (
                <span className="text-muted-foreground">· {t(`order.artwork.status.${row.original.latestDesignStatus}`)}</span>
              )}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">{row.original.artworkRequired ? '—' : t('orders.noArtwork')}</span>
          ),
      },
      {
        id: 'assignedAt',
        accessorFn: (row) => row.assignedAt ?? row.createdAt,
        header: t('orders.column.received'),
        enableColumnFilter: false,
        meta: { className: 'min-w-[110px]' },
        cell: ({ row }) => formatDate(row.original.assignedAt ?? row.original.createdAt),
      },
      {
        id: 'open',
        header: '',
        enableColumnFilter: false,
        enableSorting: false,
        meta: { className: 'w-[90px]', pin: 'right' },
        cell: ({ row }) => (
          <Button asChild size="sm" variant="ghost">
            <Link to={`/vendor/orders/${row.original.id}`} aria-label={`${t('orders.open')} ${row.original.displayId}`}>
              {t('orders.open')}
              <ArrowRight />
            </Link>
          </Button>
        ),
      },
    ],
    [t],
  )

  return (
    <div>
      <MasterPageHeader title={t('orders.title')} description={t('orders.subtitle')} extra={<VendorDivisionFilter />} />
      <AppTabs
        value={tab}
        onValueChange={(value) => setParams(value === ALL ? {} : { stage: value }, { replace: true })}
        className="mb-3"
        tabs={[
          { value: ALL, label: t('orders.all'), badge: summary?.total || undefined },
          ...stages.map((stage) => ({ value: stage, label: t(`stage.${stage}`), badge: counts[stage] || undefined })),
        ]}
      />
      <DataTable<Row>
        columns={columns}
        fetchData={fetchOrders}
        refetchInterval={LIVE_REFRESH_MS}
        listFields={LIST_FIELDS}
        searchable
        showRowSelectionColumn={false}
        defaultSort={{ id: 'assignedAt', desc: true }}
        getRowId={(row) => row.id}
        tableId={`vendor-orders-${tab}-${division}`}
        configNamespace="vendor-orders"
        emptyState={<EmptyTable icon={<ShoppingBag className="h-8 w-8 opacity-50" />} message={t('orders.emptyTitle')} description={t('orders.emptyBody')} />}
      />
    </div>
  )
}
