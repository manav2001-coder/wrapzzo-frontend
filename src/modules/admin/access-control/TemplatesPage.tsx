import type { ColumnDef } from '@tanstack/react-table'
import { Copy, ShieldCheck, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import type { AccessTemplate } from '@/api/templates'
import { DataTable } from '@/components/data-table'
import { listEmptyBody } from '@/components/data-table/list-body'
import { IconButton } from '@/components/icon-button'
import { MasterPageHeader, useMasterColumns } from '@/components/masters/master-page'
import { Badge } from '@/components/ui/badge'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useHasAccess } from '@/hooks/use-permission'
import { useAccessCompany } from '@/hooks/useAccessCompany'
import { useCloneTemplate, useDeleteTemplate, useTemplates, useUpdateTemplate } from '@/hooks/useTemplates'
import type { ListFieldMap } from '@/lib/list-fields'
import { P } from '@/lib/permissions'
import { ScopeBar } from './ScopeBar'
import { TemplateDialog } from './TemplateDialog'

const LIST_FIELDS: ListFieldMap = { name: 'text', description: 'text', scope: 'enum', direct: 'number', effective: 'number', roleCount: 'number', userCount: 'number' }

/**
 * Template master: the templates in scope -- the system masters, shared by every company, and the
 * selected company's own. A company clones a system master to change a copy; platform staff edit
 * the masters themselves (with no company picked, only those are listed).
 */
export function TemplatesPage() {
  const { t } = useTranslation('admin')
  const showError = useApiErrorToast()
  const canEdit = useHasAccess(P.TEMPLATE_EDIT)
  const { isPlatformStaff, companyId } = useAccessCompany()
  const { data: templates, isLoading, error, refetch } = useTemplates(companyId)
  const cloneTemplate = useCloneTemplate(companyId ?? '')
  const updateTemplate = useUpdateTemplate()
  const deleteTemplate = useDeleteTemplate()
  const [editing, setEditing] = useState<AccessTemplate | 'new' | null>(null)

  const list = useMemo(() => templates ?? [], [templates])
  // A system master is edited by platform staff only; everyone else clones it.
  const mayChange = (template: AccessTemplate) => canEdit && (!template.system || isPlatformStaff)
  const editorScope = editing && editing !== 'new' ? editing.companyId : (companyId ?? null)

  async function run(action: () => Promise<unknown>, message: string) {
    try {
      await action()
      toast.success(message)
    } catch (err) {
      showError(err)
    }
  }

  const setActive = (template: AccessTemplate, active: boolean) =>
    run(
      () =>
        updateTemplate.mutateAsync({
          templateId: template.id,
          input: {
            name: template.name,
            description: template.description ?? undefined,
            active,
            accessControlIds: template.accessControlIds,
            referencedTemplateIds: template.referencedTemplateIds,
          },
        }),
      t(active ? 'templates.activated' : 'templates.deactivated', { name: template.name }),
    )

  const { statusColumn, actionsColumn, deactivateDialog } = useMasterColumns<AccessTemplate>({
    isActive: (template) => template.active,
    onEdit: (template) => (mayChange(template) ? setEditing(template) : undefined),
    onActivate: (template) => (mayChange(template) ? setActive(template, true) : undefined),
    onDeactivate: (template) => (mayChange(template) ? setActive(template, false) : undefined),
    editPermission: P.TEMPLATE_EDIT,
    deletePermission: P.TEMPLATE_EDIT,
    extraActions: (template) => (
      <>
        {companyId && canEdit && (
          <IconButton
            icon={Copy}
            label={t('templates.clone', { name: template.name })}
            onClick={() => void run(() => cloneTemplate.mutateAsync({ templateId: template.id, name: t('templates.copyName', { name: template.name }) }), t('templates.cloned', { name: template.name }))}
          />
        )}
        {mayChange(template) && (
          <IconButton
            icon={Trash2}
            label={t('templates.delete', { name: template.name })}
            tone="destructive"
            onClick={() => void run(() => deleteTemplate.mutateAsync(template.id), t('templates.deleted', { name: template.name }))}
          />
        )}
      </>
    ),
  })

  const columns = useMemo<ColumnDef<AccessTemplate, unknown>[]>(
    () => [
      { id: 'name', accessorKey: 'name', header: t('templates.column.name'), meta: { className: 'min-w-[200px]', align: 'left' }, cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
      { id: 'description', accessorFn: (template) => template.description ?? '', header: t('templates.column.description'), meta: { className: 'min-w-[200px]' } },
      {
        id: 'scope',
        accessorFn: (template) => (template.system ? 'system' : 'company'),
        header: t('templates.column.scope'),
        meta: { className: 'min-w-[110px]' },
        cell: ({ row }) => <Badge variant={row.original.system ? 'secondary' : 'outline'}>{t(row.original.system ? 'templates.scope.system' : 'templates.scope.company')}</Badge>,
      },
      { id: 'direct', accessorFn: (template) => template.accessControlIds.length, header: t('templates.column.direct'), meta: { className: 'min-w-[90px]' } },
      { id: 'effective', accessorFn: (template) => template.effectiveAccessControlIds.length, header: t('templates.column.effective'), meta: { className: 'min-w-[90px]' } },
      { id: 'roleCount', accessorKey: 'roleCount', header: t('templates.column.roles'), meta: { className: 'min-w-[80px]' } },
      { id: 'userCount', accessorKey: 'userCount', header: t('templates.column.users'), meta: { className: 'min-w-[80px]' } },
      statusColumn,
      actionsColumn,
    ],
    [t, statusColumn, actionsColumn],
  )

  return (
    <div>
      <MasterPageHeader
        title={t('templates.title')}
        description={t('templates.subtitle')}
        createLabel={companyId ? t('templates.new') : t('templates.newSystem')}
        createPermission={P.TEMPLATE_EDIT}
        onCreate={companyId || isPlatformStaff ? () => setEditing('new') : undefined}
      />
      <ScopeBar id="templates-company" allowSystem />
      <DataTable<AccessTemplate>
        columns={columns}
        data={list}
        isLoading={isLoading}
        listFields={LIST_FIELDS}
        searchable
        showRowSelectionColumn={false}
        pageSize={25}
        tableId="tbac-templates"
        configNamespace="tbac-templates"
        getRowId={(template) => template.id}
        emptyState={listEmptyBody({ error, onRetry: () => void refetch(), icon: <ShieldCheck className="h-8 w-8 opacity-50" />, message: t('templates.empty') })}
      />
      {deactivateDialog}
      {editing && (
        <TemplateDialog
          key={editing === 'new' ? 'new' : editing.id}
          companyId={editorScope}
          template={editing === 'new' ? undefined : editing}
          others={list.filter((other) => (editorScope ? true : other.system))}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
