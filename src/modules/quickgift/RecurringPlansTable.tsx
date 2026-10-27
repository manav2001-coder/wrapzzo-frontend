import type { ColumnDef } from '@tanstack/react-table'
import { AlertTriangle, Pause, Play, Repeat, Send, X } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import type { RecurringOrderPlan, RecurringPlanAction, RecurringPlanStatus } from '@/api/recurringOrders'
import { DataTable } from '@/components/data-table'
import { listEmptyBody } from '@/components/data-table/list-body'
import { IconButton } from '@/components/icon-button'
import { Badge } from '@/components/ui/badge'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useMyRecurringOrderPlans, useRecurringOrderPlanAction } from '@/hooks/useRecurringOrders'
import { formatDate } from '@/lib/datetime'
import type { ListFieldMap } from '@/lib/list-fields'

const LIST_FIELDS: ListFieldMap = {
  giftName: 'text',
  recipientName: 'text',
  quantity: 'number',
  status: 'enum',
  runsCompleted: 'number',
}

const STATUSES: RecurringPlanStatus[] = ['ACTIVE', 'PAUSED', 'CANCELLED']

const STATUS_VARIANT: Record<RecurringPlanStatus, 'success-soft' | 'warning-soft' | 'secondary-soft'> = {
  ACTIVE: 'success-soft',
  PAUSED: 'warning-soft',
  CANCELLED: 'secondary-soft',
}

/** The requester's monthly orders: when the next one goes out, and pause / resume / cancel / place it now. */
export function RecurringPlansTable() {
  const { t } = useTranslation('gifts')
  const showError = useApiErrorToast()
  const { data: plans, isLoading, error, refetch } = useMyRecurringOrderPlans()
  const act = useRecurringOrderPlanAction()

  const columns = useMemo<ColumnDef<RecurringOrderPlan, unknown>[]>(() => {
    async function run(plan: RecurringOrderPlan, action: RecurringPlanAction) {
      try {
        await act.mutateAsync({ id: plan.id, action })
        toast.success(t(`monthly.done.${action}`, { name: plan.recipientName }))
      } catch (err) {
        showError(err)
      }
    }

    return [
      { id: 'giftName', accessorKey: 'giftName', header: t('landing.column.gift'), meta: { className: 'min-w-[180px]', align: 'left' } },
      { id: 'recipientName', accessorKey: 'recipientName', header: t('landing.column.recipient'), meta: { className: 'min-w-[160px]' } },
      {
        id: 'quantity',
        accessorKey: 'quantity',
        header: t('landing.column.quantity'),
        enableColumnFilter: false,
        meta: { className: 'min-w-[70px]', align: 'right' },
      },
      {
        id: 'nextRunOn',
        accessorKey: 'nextRunOn',
        header: t('monthly.column.next'),
        enableColumnFilter: false,
        meta: { className: 'min-w-[130px]' },
        cell: ({ row }) =>
          row.original.status === 'CANCELLED' ? (
            '—'
          ) : (
            <span className="flex items-center gap-1.5">
              {formatDate(row.original.nextRunOn)}
              {row.original.lastError && (
                <span title={row.original.lastError} className="text-warning">
                  <AlertTriangle className="h-3.5 w-3.5" aria-label={t('monthly.lastRunFailed')} />
                </span>
              )}
            </span>
          ),
      },
      {
        id: 'runsCompleted',
        accessorKey: 'runsCompleted',
        header: t('monthly.column.placed'),
        enableColumnFilter: false,
        meta: { className: 'min-w-[80px]', align: 'right' },
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: t('landing.column.status'),
        filterFn: 'equals',
        meta: {
          className: 'min-w-[110px]',
          filterVariant: 'select',
          filterOptions: STATUSES.map((value) => ({ value, label: t(`monthly.status.${value}`) })),
        },
        cell: ({ row }) => <Badge variant={STATUS_VARIANT[row.original.status]}>{t(`monthly.status.${row.original.status}`)}</Badge>,
      },
      {
        id: 'actions',
        header: '',
        enableColumnFilter: false,
        enableSorting: false,
        meta: { className: 'w-[140px]', pin: 'right' },
        cell: ({ row }) => {
          const plan = row.original
          if (plan.status === 'CANCELLED') return null
          return (
            <div className="flex justify-end gap-1">
              <IconButton icon={Send} label={t('monthly.placeNextNow')} disabled={act.isPending} onClick={() => void run(plan, 'placeNextNow')} />
              {plan.status === 'ACTIVE' ? (
                <IconButton icon={Pause} label={t('monthly.pause')} disabled={act.isPending} onClick={() => void run(plan, 'pause')} />
              ) : (
                <IconButton icon={Play} label={t('monthly.resume')} disabled={act.isPending} onClick={() => void run(plan, 'resume')} />
              )}
              <IconButton icon={X} label={t('monthly.cancel')} disabled={act.isPending} onClick={() => void run(plan, 'cancel')} />
            </div>
          )
        },
      },
    ]
  }, [t, act, showError])

  return (
    <DataTable<RecurringOrderPlan>
      columns={columns}
      data={plans ?? []}
      isLoading={isLoading}
      listFields={LIST_FIELDS}
      searchable
      showRowSelectionColumn={false}
      defaultSort={{ id: 'nextRunOn', desc: false }}
      getRowId={(plan) => plan.id}
      tableId="my-recurring-orders"
      configNamespace="my-recurring-orders"
      emptyState={listEmptyBody({
        error,
        onRetry: () => void refetch(),
        icon: <Repeat className="h-8 w-8 opacity-50" />,
        message: t('monthly.emptyTitle'),
        description: t('monthly.emptyBody'),
      })}
    />
  )
}
