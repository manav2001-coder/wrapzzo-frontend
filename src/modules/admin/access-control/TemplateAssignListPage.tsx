import type { ColumnDef } from '@tanstack/react-table'
import { ListChecks } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import type { AccessTemplate } from '@/api/templates'
import { DataTable } from '@/components/data-table'
import { listEmptyBody } from '@/components/data-table/list-body'
import { MasterPageHeader } from '@/components/masters/master-page'
import { StatusCell } from '@/components/masters/master-page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAccessCompany } from '@/hooks/useAccessCompany'
import { useTemplates } from '@/hooks/useTemplates'
import type { ListFieldMap } from '@/lib/list-fields'
import { ScopeBar } from './ScopeBar'

const LIST_FIELDS: ListFieldMap = { name: 'text', scope: 'enum', count: 'number', effective: 'number' }

/**
 * The first half of Features to Template and Templates to Template: the templates in scope, with
 * how much each holds, and a button into the screen that assigns. (Like MobixFL: a list, then an
 * assign page per row.) `kind` picks what the count column shows.
 */
export function TemplateAssignListPage({ kind, assignPath }: { kind: 'features' | 'templates'; assignPath: string }) {
  const { t } = useTranslation('admin')
  const navigate = useNavigate()
  const { companyId, scoped } = useAccessCompany()
  const { data: templates, isLoading, error, refetch } = useTemplates(companyId)

  const columns = useMemo<ColumnDef<AccessTemplate, unknown>[]>(
    () => [
      { id: 'name', accessorKey: 'name', header: t('templates.column.name'), meta: { className: 'min-w-[220px]', align: 'left' }, cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
      {
        id: 'scope',
        accessorFn: (template) => (template.system ? 'system' : 'company'),
        header: t('templates.column.scope'),
        meta: { className: 'min-w-[110px]' },
        cell: ({ row }) => <Badge variant={row.original.system ? 'secondary' : 'outline'}>{t(row.original.system ? 'templates.scope.system' : 'templates.scope.company')}</Badge>,
      },
      {
        id: 'count',
        accessorFn: (template) => (kind === 'features' ? template.accessControlIds.length : template.referencedTemplateIds.length),
        header: t(kind === 'features' ? 'templates.column.direct' : 'templates.column.includes'),
        meta: { className: 'min-w-[100px]' },
      },
      { id: 'effective', accessorFn: (template) => template.effectiveAccessControlIds.length, header: t('templates.column.effective'), meta: { className: 'min-w-[100px]' } },
      { id: 'status', accessorFn: (template) => (template.active ? 'active' : 'inactive'), header: t('field.status', { ns: 'common' }), meta: { className: 'min-w-[110px]' }, cell: ({ row }) => <StatusCell active={row.original.active} /> },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        enableColumnFilter: false,
        meta: { className: 'w-[140px]', align: 'right' },
        cell: ({ row }) => (
          <Button size="sm" variant="outline" aria-label={t('assign.open', { name: row.original.name })} onClick={() => navigate(scoped(`${assignPath}/${row.original.id}`))}>
            {t('assign.assign')}
          </Button>
        ),
      },
    ],
    [t, kind, navigate, scoped, assignPath],
  )

  return (
    <div>
      <MasterPageHeader title={t(kind === 'features' ? 'featuresToTemplate.title' : 'templatesToTemplate.title')} description={t(kind === 'features' ? 'featuresToTemplate.listSubtitle' : 'templatesToTemplate.listSubtitle')} />
      <ScopeBar id={`${kind}-company`} allowSystem />
      <DataTable<AccessTemplate>
        columns={columns}
        data={templates ?? []}
        isLoading={isLoading}
        listFields={LIST_FIELDS}
        searchable
        showRowSelectionColumn={false}
        pageSize={25}
        tableId={`tbac-${kind}-to-template`}
        configNamespace={`tbac-${kind}-to-template`}
        getRowId={(template) => template.id}
        emptyState={listEmptyBody({ error, onRetry: () => void refetch(), icon: <ListChecks className="h-8 w-8 opacity-50" />, message: t('templates.empty') })}
      />
    </div>
  )
}
