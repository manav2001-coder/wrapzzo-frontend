import type { ColumnDef } from '@tanstack/react-table'
import { CheckCircle2, Inbox, Pencil, PackageCheck, Truck, Warehouse as WarehouseIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import type { OrderStatus } from '@/api/orders'
import type { Warehouse, WarehouseOrder } from '@/api/warehouses'
import { AppDialog } from '@/components/app-dialog'
import { AppTabs } from '@/components/app-tabs'
import { DataTable } from '@/components/data-table'
import { listEmptyBody } from '@/components/data-table/list-body'
import { FormGenerator } from '@/components/fields/form-generator'
import { IconButton } from '@/components/icon-button'
import { phoneField, selectField, switchField, textField } from '@/components/masters/master-fields'
import { MasterPageHeader, StatusCell } from '@/components/masters/master-page'
import { OrderStatusBadge } from '@/components/orders/order-status'
import { StatCard } from '@/components/stat-card'
import { Button } from '@/components/ui/button'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useMyOrgUnits } from '@/hooks/useMyOrgUnits'
import { useAdvanceWarehouseOrder, useSaveWarehouse, useWarehouseOrders, useWarehouses } from '@/hooks/useWarehouses'
import { formatDateTime } from '@/lib/datetime'
import type { ListFieldMap } from '@/lib/list-fields'

const COMPANY_WIDE = '__company_wide__'

const ORDER_LIST_FIELDS: ListFieldMap = {
  displayId: 'text',
  warehouseName: 'text',
  giftName: 'text',
  recipientName: 'text',
  vendorName: 'text',
  quantity: 'number',
  status: 'enum',
}

const WAREHOUSE_LIST_FIELDS: ListFieldMap = { name: 'text', orgUnitName: 'text', address: 'text' }

const QUEUE_STATUSES: OrderStatus[] = ['PRODUCTION_QUEUE', 'DISPATCHED', 'RECEIVED_AT_WAREHOUSE', 'OUT_FOR_DELIVERY', 'DELIVERED']

/** The warehouse's one move from each stage -- mirrors WarehouseService.NEXT_STAGE, which is the enforcement. */
const NEXT_STEP: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  DISPATCHED: { status: 'RECEIVED_AT_WAREHOUSE', label: 'Mark received' },
  RECEIVED_AT_WAREHOUSE: { status: 'OUT_FOR_DELIVERY', label: 'Send out for delivery' },
  OUT_FOR_DELIVERY: { status: 'DELIVERED', label: 'Mark delivered' },
}

type Tab = 'orders' | 'warehouses'

function WarehouseDialog({ warehouse, onClose }: { warehouse: Warehouse | null; onClose: () => void }) {
  const showError = useApiErrorToast()
  const save = useSaveWarehouse()
  const { data: orgUnits } = useMyOrgUnits()
  const editing = warehouse !== null

  const fields = useMemo(
    () => [
      textField({ id: 'name', label: 'Warehouse name', required: true, max: 200 }),
      phoneField({ id: 'contactPhone', label: 'Contact phone', max: 50 }),
      textField({ id: 'address', label: 'Address', required: true, max: 2000, multiline: true, spanToFullRow: true }),
      selectField({
        id: 'orgUnitId',
        label: 'Serves',
        required: true,
        spanToFullRow: true,
        options: [
          { value: COMPANY_WIDE, label: 'Whole company (fallback)' },
          ...(orgUnits ?? []).map((u) => ({ value: u.id, label: `${u.levelName}: ${u.name}` })),
        ],
      }),
      ...(editing ? [switchField({ id: 'active', label: 'Active', initialValue: true })] : []),
    ],
    [orgUnits, editing],
  )

  async function onSubmit(values: Record<string, unknown>) {
    try {
      await save.mutateAsync({
        id: warehouse?.id,
        input: {
          name: String(values.name).trim(),
          address: String(values.address).trim(),
          contactPhone: String(values.contactPhone ?? '').trim() || undefined,
          orgUnitId: values.orgUnitId === COMPANY_WIDE ? null : String(values.orgUnitId),
          active: editing ? Boolean(values.active) : undefined,
        },
      })
      toast.success(editing ? 'Warehouse updated' : 'Warehouse added')
      onClose()
    } catch (err) {
      showError(err)
    }
  }

  return (
    <AppDialog
      open
      onOpenChange={(open) => !open && onClose()}
      size="md"
      title={editing ? `Edit ${warehouse.name}` : 'Add warehouse'}
      description="Orders from the unit it serves, and every unit under it, are shipped here by the vendor. A whole-company warehouse takes the orders no closer warehouse serves."
      footer={<></>}
    >
      <FormGenerator
        fields={fields}
        values={
          warehouse
            ? {
                name: warehouse.name,
                address: warehouse.address,
                contactPhone: warehouse.contactPhone ?? '',
                orgUnitId: warehouse.orgUnitId ?? COMPANY_WIDE,
                active: warehouse.active,
              }
            : { orgUnitId: COMPANY_WIDE }
        }
        mode={editing ? 'edit' : 'create'}
        maxWidgetsPerRow={2}
        submitLabel={editing ? 'Save' : 'Add warehouse'}
        hideCardWrapper
        onSubmit={onSubmit}
      />
    </AppDialog>
  )
}

function WarehouseOrdersTab() {
  const { t } = useTranslation('orders')
  const showError = useApiErrorToast()
  const { data: orders, isLoading, error, refetch } = useWarehouseOrders()
  const advance = useAdvanceWarehouseOrder()
  const [statusFilter, setStatusFilter] = useState<OrderStatus | null>(null)

  const count = (status: OrderStatus) => (orders ?? []).filter((o) => o.status === status).length
  const visible = statusFilter ? (orders ?? []).filter((o) => o.status === statusFilter) : (orders ?? [])
  const toggle = (status: OrderStatus) => setStatusFilter((current) => (current === status ? null : status))

  const columns = useMemo<ColumnDef<WarehouseOrder, unknown>[]>(() => {
    async function move(order: WarehouseOrder, status: OrderStatus, label: string) {
      try {
        await advance.mutateAsync({ id: order.id, status })
        toast.success(`${order.displayId}: ${label.toLowerCase()}`)
      } catch (err) {
        showError(err)
      }
    }

    return [
      { id: 'displayId', accessorKey: 'displayId', header: 'Order', meta: { className: 'min-w-[100px]', align: 'left' } },
      { id: 'giftName', accessorFn: (o) => o.giftName ?? '', header: 'Item', meta: { className: 'min-w-[160px]' } },
      {
        id: 'quantity',
        accessorKey: 'quantity',
        header: 'Qty',
        enableColumnFilter: false,
        meta: { className: 'min-w-[70px]', align: 'right' },
      },
      {
        id: 'recipientName',
        accessorFn: (o) => o.recipientName ?? '',
        header: 'Deliver to',
        meta: { className: 'min-w-[220px]' },
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-medium">{row.original.recipientName}</p>
            <p className="truncate text-xs text-muted-foreground">
              {[row.original.recipientPhone, row.original.deliveryAddress].filter(Boolean).join(' · ')}
            </p>
          </div>
        ),
      },
      { id: 'warehouseName', accessorKey: 'warehouseName', header: 'Warehouse', meta: { className: 'min-w-[150px]' } },
      { id: 'vendorName', accessorFn: (o) => o.vendorName ?? '', header: 'From vendor', meta: { className: 'min-w-[140px]' } },
      {
        id: 'status',
        accessorKey: 'status',
        header: 'Status',
        filterFn: 'equals',
        meta: {
          className: 'min-w-[140px]',
          filterVariant: 'select',
          filterOptions: QUEUE_STATUSES.map((value) => ({ value, label: t(`status.${value}`) })),
        },
        cell: ({ row }) => <OrderStatusBadge status={row.original.status} />,
      },
      {
        id: 'updatedAt',
        accessorKey: 'updatedAt',
        header: 'Updated',
        enableColumnFilter: false,
        meta: { className: 'min-w-[140px]' },
        cell: ({ row }) => formatDateTime(row.original.updatedAt),
      },
      {
        id: 'actions',
        header: '',
        enableColumnFilter: false,
        enableSorting: false,
        meta: { className: 'w-[190px]', pin: 'right' },
        cell: ({ row }) => {
          const next = NEXT_STEP[row.original.status]
          if (!next) {
            return row.original.status === 'PRODUCTION_QUEUE' ? (
              <span className="text-xs text-muted-foreground">With the vendor</span>
            ) : null
          }
          return (
            <Button size="sm" disabled={advance.isPending} onClick={() => void move(row.original, next.status, next.label)}>
              {next.label}
            </Button>
          )
        },
      },
    ]
  }, [advance, showError, t])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          title="Inbound from vendors"
          value={count('DISPATCHED')}
          icon={Truck}
          color="warning"
          loading={isLoading}
          active={statusFilter === 'DISPATCHED'}
          onClick={() => toggle('DISPATCHED')}
        />
        <StatCard
          title="At the warehouse"
          value={count('RECEIVED_AT_WAREHOUSE')}
          icon={Inbox}
          color="primary"
          loading={isLoading}
          active={statusFilter === 'RECEIVED_AT_WAREHOUSE'}
          onClick={() => toggle('RECEIVED_AT_WAREHOUSE')}
        />
        <StatCard
          title="Out for delivery"
          value={count('OUT_FOR_DELIVERY')}
          icon={PackageCheck}
          color="primary"
          loading={isLoading}
          active={statusFilter === 'OUT_FOR_DELIVERY'}
          onClick={() => toggle('OUT_FOR_DELIVERY')}
        />
        <StatCard
          title="Delivered"
          value={count('DELIVERED')}
          icon={CheckCircle2}
          color="success"
          loading={isLoading}
          active={statusFilter === 'DELIVERED'}
          onClick={() => toggle('DELIVERED')}
        />
      </div>
      <DataTable<WarehouseOrder>
        columns={columns}
        data={visible}
        isLoading={isLoading}
        listFields={ORDER_LIST_FIELDS}
        searchable
        showRowSelectionColumn={false}
        defaultSort={{ id: 'updatedAt', desc: true }}
        getRowId={(o) => o.id}
        tableId="warehouse-orders"
        configNamespace="warehouse-orders"
        emptyState={listEmptyBody({
          error,
          onRetry: () => void refetch(),
          icon: <WarehouseIcon className="h-8 w-8 opacity-50" />,
          message: 'No orders through your warehouses yet',
          description: 'Orders are routed here when Warehouse Logistics is on and a warehouse serves the org unit they came from.',
        })}
      />
    </div>
  )
}

function WarehouseSetupTab({ onEdit }: { onEdit: (warehouse: Warehouse) => void }) {
  const { data: warehouses, isLoading, error, refetch } = useWarehouses()

  const columns = useMemo<ColumnDef<Warehouse, unknown>[]>(
    () => [
      { id: 'name', accessorKey: 'name', header: 'Warehouse', meta: { className: 'min-w-[180px]', align: 'left' } },
      {
        id: 'orgUnitName',
        accessorFn: (w) => w.orgUnitName ?? 'Whole company',
        header: 'Serves',
        meta: { className: 'min-w-[160px]' },
      },
      { id: 'address', accessorKey: 'address', header: 'Address', meta: { className: 'min-w-[240px]' } },
      {
        id: 'active',
        accessorKey: 'active',
        header: 'Status',
        enableColumnFilter: false,
        meta: { className: 'min-w-[110px]' },
        cell: ({ row }) => <StatusCell active={row.original.active} label={row.original.active ? 'Active' : 'Inactive'} />,
      },
      {
        id: 'actions',
        header: '',
        enableColumnFilter: false,
        enableSorting: false,
        meta: { className: 'w-[56px]', pin: 'right' },
        cell: ({ row }) => <IconButton icon={Pencil} label={`Edit ${row.original.name}`} onClick={() => onEdit(row.original)} />,
      },
    ],
    [onEdit],
  )

  return (
    <DataTable<Warehouse>
      columns={columns}
      data={warehouses ?? []}
      isLoading={isLoading}
      listFields={WAREHOUSE_LIST_FIELDS}
      searchable
      showRowSelectionColumn={false}
      getRowId={(w) => w.id}
      tableId="company-warehouses"
      configNamespace="company-warehouses"
      emptyState={listEmptyBody({
        error,
        onRetry: () => void refetch(),
        icon: <WarehouseIcon className="h-8 w-8 opacity-50" />,
        message: 'No warehouses yet',
        description: 'Add one so vendors ship orders to you, and you deliver them onward.',
      })}
    />
  )
}

/**
 * The warehouse leg (Warehouse Logistics): vendors ship orders to the company's warehouse, which
 * receives them and delivers them to the doctor. Setup lives on the second tab.
 */
export function WarehousesPage() {
  const [tab, setTab] = useState<Tab>('orders')
  // undefined = closed, null = adding, a warehouse = editing it.
  const [dialog, setDialog] = useState<Warehouse | null | undefined>(undefined)

  return (
    <div>
      <MasterPageHeader
        title="Warehouses"
        description="Receive orders from vendors and deliver them to the doctor."
        createLabel="Add warehouse"
        createPermission="warehouse.manage"
        onCreate={() => setDialog(null)}
      />
      <AppTabs
        value={tab}
        onValueChange={(value) => setTab(value as Tab)}
        className="frame-free"
        tabs={[
          { value: 'orders', label: 'Orders', icon: Truck, content: <WarehouseOrdersTab /> },
          { value: 'warehouses', label: 'Warehouses', icon: WarehouseIcon, content: <WarehouseSetupTab onEdit={setDialog} /> },
        ]}
      />
      {dialog !== undefined && <WarehouseDialog warehouse={dialog} onClose={() => setDialog(undefined)} />}
    </div>
  )
}
