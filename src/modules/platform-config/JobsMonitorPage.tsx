import type { ColumnDef } from '@tanstack/react-table'
import { Briefcase, RotateCcw, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { JOBS_PATH, removeJobRun, retryJobRun, type JobRun } from '@/api/jobs'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { DataTable } from '@/components/data-table'
import { listEmptyBody } from '@/components/data-table/list-body'
import { IconButton } from '@/components/icon-button'
import { MasterPageHeader } from '@/components/masters/master-page'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useHasAccess } from '@/hooks/use-permission'
import { useUserTimezone } from '@/hooks/use-user-timezone'
import { formatDateTime } from '@/lib/datetime'
import { tableFetcher } from '@/lib/masters-api'
import { P } from '@/lib/permissions'

const POLL_INTERVAL_MS = 4000
const STATUSES: JobRun['status'][] = ['RUNNING', 'COMPLETED', 'FAILED']

const STATUS_VARIANT: Record<JobRun['status'], BadgeProps['variant']> = {
  RUNNING: 'default',
  COMPLETED: 'success',
  FAILED: 'destructive',
}

function JobDetailPanel({ run }: { run: JobRun }) {
  const { t } = useTranslation('admin')
  const timeZone = useUserTimezone()
  const failed = run.status === 'FAILED'

  return (
    <div className="grid gap-4 rounded-md bg-muted/30 p-4 sm:grid-cols-2">
      <dl className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
        <dt>{t('platformConfig.jobs.detail.started')}</dt>
        <dd>{formatDateTime(run.startedAt, { timeZone })}</dd>
        <dt>{t('platformConfig.jobs.detail.finished')}</dt>
        <dd>{formatDateTime(run.finishedAt, { timeZone })}</dd>
        <dt>{t('platformConfig.jobs.detail.attempts')}</dt>
        <dd>{run.attempts}</dd>
      </dl>
      <div className="space-y-2">
        <p className="text-sm font-medium">{failed ? t('platformConfig.jobs.detail.error') : t('platformConfig.jobs.detail.result')}</p>
        <pre className="max-h-48 overflow-auto rounded bg-background p-2 text-xs whitespace-pre-wrap">{(failed ? run.error : run.result) ?? '-'}</pre>
      </div>
    </div>
  )
}

/** Platform config > Background jobs (MobixFL's jobs monitor): every run, how it ended, run a failed one again. */
export function JobsMonitorPage() {
  const { t } = useTranslation(['admin', 'common'])
  const showError = useApiErrorToast()
  const timeZone = useUserTimezone()
  const canManage = useHasAccess(P.PLATFORM_JOBS_MANAGE)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [removing, setRemoving] = useState<JobRun | null>(null)

  // Only the list polls; a row's detail is whatever the last poll brought.
  useEffect(() => {
    const interval = setInterval(() => setRefreshTrigger((n) => n + 1), POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])

  const fetchRuns = useMemo(() => tableFetcher<JobRun>(JOBS_PATH), [])

  async function retry(run: JobRun) {
    try {
      const again = await retryJobRun(run.id)
      toast.success(t(again.status === 'FAILED' ? 'platformConfig.jobs.retriedFailed' : 'platformConfig.jobs.retried', { ns: 'admin', job: run.label }))
    } catch (error) {
      showError(error)
    } finally {
      setRefreshTrigger((n) => n + 1)
    }
  }

  async function remove(run: JobRun) {
    try {
      await removeJobRun(run.id)
      toast.success(t('platformConfig.jobs.removed', { ns: 'admin' }))
    } catch (error) {
      showError(error)
    } finally {
      setRefreshTrigger((n) => n + 1)
    }
  }

  const columns = useMemo<ColumnDef<JobRun, unknown>[]>(
    () => [
      { id: 'label', accessorKey: 'label', header: t('platformConfig.jobs.column.job', { ns: 'admin' }), meta: { className: 'min-w-[200px]' } },
      {
        id: 'status',
        accessorKey: 'status',
        header: t('field.status', { ns: 'common' }),
        meta: {
          className: 'min-w-[120px]',
          filterVariant: 'select',
          filterOptions: STATUSES.map((value) => ({ value, label: t(`platformConfig.jobs.status.${value}`, { ns: 'admin' }) })),
        },
        cell: ({ row }) => <Badge variant={STATUS_VARIANT[row.original.status]}>{t(`platformConfig.jobs.status.${row.original.status}`, { ns: 'admin' })}</Badge>,
      },
      { id: 'triggeredBy', accessorKey: 'triggeredBy', header: t('platformConfig.jobs.column.triggeredBy', { ns: 'admin' }), meta: { className: 'min-w-[160px]' } },
      {
        id: 'startedAt',
        accessorKey: 'startedAt',
        header: t('platformConfig.jobs.column.started', { ns: 'admin' }),
        enableColumnFilter: false,
        meta: { className: 'min-w-[170px]' },
        cell: ({ row }) => formatDateTime(row.original.startedAt, { timeZone }),
      },
      {
        id: 'attempts',
        accessorKey: 'attempts',
        header: t('platformConfig.jobs.column.attempts', { ns: 'admin' }),
        enableColumnFilter: false,
        enableSorting: false,
        meta: { className: 'min-w-[90px]' },
      },
      {
        id: 'actions',
        header: t('field.actions', { ns: 'common' }),
        enableColumnFilter: false,
        enableSorting: false,
        meta: { className: 'min-w-[110px]', pin: 'right' },
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-0.5">
            {canManage && row.original.status === 'FAILED' && (
              <IconButton icon={RotateCcw} label={t('action.retry', { ns: 'common' })} onClick={() => void retry(row.original)} />
            )}
            {canManage && row.original.status !== 'RUNNING' && (
              <IconButton icon={Trash2} tone="destructive" label={t('action.remove', { ns: 'common' })} onClick={() => setRemoving(row.original)} />
            )}
          </div>
        ),
      },
    ],
    // `retry` and `remove` only close over stable setters and the toast helpers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, canManage, timeZone],
  )

  return (
    <div>
      <MasterPageHeader title={t('platformConfig.jobs.title', { ns: 'admin' })} description={t('platformConfig.jobs.subtitle', { ns: 'admin' })} />
      <DataTable<JobRun>
        tableId="platform-config-jobs"
        configNamespace="platform-config-jobs"
        columns={columns}
        fetchData={fetchRuns}
        getRowId={(run) => run.id}
        showRowSelectionColumn={false}
        refreshTrigger={refreshTrigger}
        getRowCanExpand={() => true}
        renderSubRow={(run) => <JobDetailPanel run={run} />}
        emptyState={listEmptyBody({
          error: null,
          onRetry: () => setRefreshTrigger((n) => n + 1),
          icon: <Briefcase className="h-8 w-8 opacity-50" />,
          message: t('platformConfig.jobs.empty', { ns: 'admin' }),
        })}
      />
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={t('confirmDelete.title', { ns: 'common', name: removing?.label })}
        description={t('platformConfig.jobs.removeBody', { ns: 'admin' })}
        confirmLabel={t('action.remove', { ns: 'common' })}
        onConfirm={() => (removing ? remove(removing) : undefined)}
      />
    </div>
  )
}
