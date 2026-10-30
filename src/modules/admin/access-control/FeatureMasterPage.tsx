import type { ColumnDef } from '@tanstack/react-table'
import { ListChecks, Plus } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import type { Feature } from '@/api/features'
import { DataTable } from '@/components/data-table'
import { listEmptyBody } from '@/components/data-table/list-body'
import { EmptyState } from '@/components/empty-state'
import { MasterPageHeader } from '@/components/masters/master-page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useHasAccess } from '@/hooks/use-permission'
import { useAccessCompany } from '@/hooks/useAccessCompany'
import { useFeatures, useRegisterFeatures, useSetFeatureActive } from '@/hooks/useTemplates'
import type { ListFieldMap } from '@/lib/list-fields'
import { P } from '@/lib/permissions'
import { ScopeBar } from './ScopeBar'

const LIST_FIELDS: ListFieldMap = { category: 'text', name: 'text', key: 'text', status: 'enum' }

type FeatureStatus = 'active' | 'inactive' | 'missing'
const statusOf = (feature: Feature): FeatureStatus => (!feature.registered ? 'missing' : feature.active ? 'active' : 'inactive')

/**
 * The feature master, per company: every permission key the company could hold, whether it has
 * registered it, and whether it is on. The keys live in code, so "adding" a feature registers it
 * for the company -- one at a time or all the missing ones at once. A feature switched off grants
 * nothing wherever a template carries it.
 */
export function FeatureMasterPage() {
  const { t } = useTranslation('admin')
  const showError = useApiErrorToast()
  const canEdit = useHasAccess(P.TEMPLATE_EDIT)
  const { companyId } = useAccessCompany()
  const { data: features, isLoading, error, refetch } = useFeatures(companyId)
  const setActive = useSetFeatureActive(companyId ?? '')
  const register = useRegisterFeatures(companyId ?? '')
  const rows = useMemo(() => (companyId ? (features ?? []) : []), [companyId, features])
  const missing = rows.filter((feature) => !feature.registered)

  async function add(ids?: string[]) {
    try {
      await register.mutateAsync(ids)
      toast.success(t('features.added'))
    } catch (err) {
      showError(err)
    }
  }

  const columns = useMemo<ColumnDef<Feature, unknown>[]>(
    () => [
      { id: 'category', accessorKey: 'category', header: t('features.column.module'), meta: { className: 'min-w-[160px]' } },
      { id: 'name', accessorKey: 'name', header: t('features.column.action'), meta: { className: 'min-w-[140px]' } },
      {
        id: 'key',
        accessorKey: 'key',
        header: t('features.column.key'),
        meta: { className: 'min-w-[200px]' },
        cell: ({ row }) => <code className="text-xs">{row.original.key}</code>,
      },
      {
        id: 'status',
        accessorFn: (feature) => statusOf(feature),
        header: t('features.column.status'),
        meta: { className: 'min-w-[120px]' },
        cell: ({ row }) => {
          const status = statusOf(row.original)
          return <Badge variant={status === 'active' ? 'secondary' : 'outline'}>{t(`features.status.${status}`)}</Badge>
        },
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        enableColumnFilter: false,
        meta: { className: 'w-[160px]', align: 'right' },
        cell: ({ row }) => {
          const feature = row.original
          if (!canEdit) return null
          return feature.registered ? (
            <Switch
              aria-label={t('features.toggle', { name: `${feature.category}: ${feature.name}` })}
              checked={feature.active}
              disabled={setActive.isPending}
              onCheckedChange={(active) => setActive.mutate({ featureId: feature.id, active }, { onError: showError })}
            />
          ) : (
            <Button size="sm" variant="outline" disabled={register.isPending} onClick={() => void add([feature.id])} aria-label={t('features.add', { name: `${feature.category}: ${feature.name}` })}>
              <Plus />
              {t('features.addOne')}
            </Button>
          )
        },
      },
    ],
    [t, canEdit, setActive, register.isPending], // eslint-disable-line react-hooks/exhaustive-deps
  )

  return (
    <div>
      <MasterPageHeader
        title={t('features.title')}
        description={t('features.subtitle')}
        extra={
          canEdit && companyId && missing.length > 0 ? (
            <Button size="sm" className="h-9" disabled={register.isPending} onClick={() => void add()}>
              <Plus />
              {t('features.addAll', { count: missing.length })}
            </Button>
          ) : undefined
        }
      />
      <ScopeBar id="features-company" />
      {!companyId ? (
        <EmptyState icon={ListChecks} size="sm" title={t('features.pickCompany')} />
      ) : (
        <DataTable<Feature>
          columns={columns}
          data={rows}
          isLoading={isLoading}
          listFields={LIST_FIELDS}
          searchable
          showRowSelectionColumn={false}
          pageSize={25}
          tableId="tbac-features"
          configNamespace="tbac-features"
          getRowId={(feature) => feature.id}
          emptyState={listEmptyBody({ error, onRetry: () => void refetch(), icon: <ListChecks className="h-8 w-8 opacity-50" />, message: t('features.empty') })}
        />
      )}
    </div>
  )
}
