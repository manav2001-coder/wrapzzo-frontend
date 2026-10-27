import type { ColumnDef } from '@tanstack/react-table'
import { ArrowLeft, Download, Network, Plus, ShieldMinus, ShieldPlus, Trash2, Upload, Users } from 'lucide-react'
import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import type { CompanyUser } from '@/api/users'
import { useAppSelector } from '@/app/hooks'
import { AppDialog } from '@/components/app-dialog'
import { DataTable } from '@/components/data-table'
import { listEmptyBody } from '@/components/data-table/list-body'
import { IconButton } from '@/components/icon-button'
import { MasterPageHeader, StatusCell } from '@/components/masters/master-page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useCompanyUserContext } from '@/hooks/useCompanyUserContext'
import { useCompanyUsers, useDeleteUser, useMakeCompanyAdmin, useRemoveCompanyAdmin } from '@/hooks/useUsers'
import { formatDate } from '@/lib/datetime'
import { downloadEmployeeTemplate } from '@/lib/employeeTemplate'
import type { ListFieldMap } from '@/lib/list-fields'
import { ExtraOrgUnitsDialog } from './ExtraOrgUnitsDialog'

const COMPANY_ADMIN_ROLE_NAME = 'Company Admin'

const LIST_FIELDS: ListFieldMap = {
  name: 'text',
  email: 'text',
  mobile: 'text',
  designation: 'text',
  employeeCode: 'text',
  reportsToName: 'text',
  orgUnitName: 'text',
  roleName: 'text',
  createdAt: 'date',
}

type PendingAction = { kind: 'makeAdmin' | 'removeAdmin' | 'delete'; user: CompanyUser }

export function CompanyUsersPage() {
  const { t } = useTranslation('admin')
  const { companyId, companyName, basePath, backTo } = useCompanyUserContext()
  const navigate = useNavigate()
  const currentUserId = useAppSelector((state) => state.auth.user?.sub)
  const showError = useApiErrorToast()

  const { data: users, isLoading, error, refetch } = useCompanyUsers(companyId)
  const makeCompanyAdmin = useMakeCompanyAdmin(companyId)
  const removeCompanyAdmin = useRemoveCompanyAdmin(companyId)
  const deleteUser = useDeleteUser(companyId)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<PendingAction | null>(null)
  const [coveringFor, setCoveringFor] = useState<CompanyUser | null>(null)

  const company = companyName ?? t('users.thisCompany')

  async function confirmPending() {
    if (!pending) return
    const { kind, user } = pending
    try {
      if (kind === 'makeAdmin') {
        await makeCompanyAdmin.mutateAsync(user.id)
        toast.success(t('users.madeAdmin', { name: user.name }))
      } else if (kind === 'removeAdmin') {
        await removeCompanyAdmin.mutateAsync(user.id)
        toast.success(t('users.removedAdmin', { name: user.name }))
      } else {
        await deleteUser.mutateAsync(user.id)
        toast.success(t('users.deleted', { name: user.name }))
      }
    } catch (err) {
      showError(err)
    } finally {
      setPending(null)
    }
  }

  function onFileChosen(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) navigate(`${basePath}/import-users`, { state: { file } })
  }

  const columns = useMemo<ColumnDef<CompanyUser, unknown>[]>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: t('users.column.name'),
        meta: { className: 'min-w-[200px]', align: 'left' },
        cell: ({ row }) => (
          <span className="flex items-center gap-2.5 font-medium">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {row.original.name.charAt(0).toUpperCase()}
            </span>
            <span className="truncate">{row.original.name}</span>
          </span>
        ),
      },
      { id: 'email', accessorKey: 'email', header: t('users.column.email'), meta: { className: 'min-w-[200px]' } },
      { id: 'mobile', accessorFn: (u) => u.mobile ?? '', header: t('users.column.mobile'), meta: { className: 'min-w-[130px]' } },
      { id: 'designation', accessorFn: (u) => u.designation ?? '', header: t('users.column.designation'), meta: { className: 'min-w-[140px]' } },
      { id: 'employeeCode', accessorFn: (u) => u.employeeCode ?? '', header: t('users.column.employeeCode'), meta: { className: 'min-w-[130px]' } },
      { id: 'reportsToName', accessorFn: (u) => u.reportsToName ?? '', header: t('users.column.reportsTo'), meta: { className: 'min-w-[140px]' } },
      {
        id: 'orgUnitName',
        accessorFn: (u) => u.orgUnitName ?? '',
        header: t('users.column.orgUnit'),
        meta: { className: 'min-w-[150px]' },
        cell: ({ row }) => {
          const extra = row.original.extraOrgUnits
          return (
            <span className="flex items-center gap-1.5" title={extra.map((unit) => unit.name).join(', ') || undefined}>
              {row.original.orgUnitName ?? '—'}
              {extra.length > 0 && <Badge variant="secondary-soft">{t('users.extraUnits.more', { count: extra.length })}</Badge>}
            </span>
          )
        },
      },
      {
        id: 'roleName',
        accessorKey: 'roleName',
        header: t('users.column.access'),
        meta: { className: 'min-w-[140px]' },
        cell: ({ row }) => (
          <Badge variant={row.original.roleName === COMPANY_ADMIN_ROLE_NAME ? 'default' : 'secondary'}>{row.original.roleName}</Badge>
        ),
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: t('field.status', { ns: 'common' }),
        filterFn: 'equals',
        meta: {
          className: 'min-w-[120px]',
          filterVariant: 'select',
          filterOptions: (['ACTIVE', 'INVITED', 'SUSPENDED'] as const).map((value) => ({ value, label: t(`users.status.${value}`) })),
        },
        cell: ({ row }) => <StatusCell active={row.original.status === 'ACTIVE'} label={t(`users.status.${row.original.status}`)} />,
      },
      {
        id: 'createdAt',
        accessorKey: 'createdAt',
        header: t('users.column.added'),
        enableColumnFilter: false,
        meta: { className: 'min-w-[130px]' },
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
      {
        id: 'actions',
        header: t('field.actions', { ns: 'common' }),
        enableColumnFilter: false,
        enableSorting: false,
        meta: { className: 'min-w-[140px]', pin: 'right' },
        cell: ({ row }) => {
          const user = row.original
          const isAdmin = user.roleName === COMPANY_ADMIN_ROLE_NAME
          return (
            <div className="flex items-center justify-end gap-0.5">
              <IconButton icon={Network} label={t('users.extraUnits.action')} onClick={() => setCoveringFor(user)} />
              {isAdmin ? (
                <IconButton icon={ShieldMinus} label={t('users.removeAdmin')} onClick={() => setPending({ kind: 'removeAdmin', user })} />
              ) : (
                <IconButton icon={ShieldPlus} label={t('users.makeAdmin')} onClick={() => setPending({ kind: 'makeAdmin', user })} />
              )}
              {user.id !== currentUserId && (
                <IconButton icon={Trash2} label={t('users.delete')} tone="destructive" onClick={() => setPending({ kind: 'delete', user })} />
              )}
            </div>
          )
        },
      },
    ],
    [t, currentUserId],
  )

  const dialog = pending && {
    makeAdmin: { title: t('users.makeAdmin'), body: t('users.makeAdminBody', { name: pending.user.name, company }), destructive: false },
    removeAdmin: { title: t('users.removeAdmin'), body: t('users.removeAdminBody', { name: pending.user.name }), destructive: false },
    delete: { title: t('users.delete'), body: t('users.deleteBody', { name: pending.user.name }), destructive: true },
  }[pending.kind]

  return (
    <div>
      <MasterPageHeader
        lead={<IconButton icon={ArrowLeft} label={t('users.back')} onClick={() => navigate(backTo)} />}
        title={t('users.title')}
        description={companyName ? t('users.subtitle', { company: companyName }) : t('users.subtitleNoName')}
        extra={
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" className="h-9" onClick={() => void downloadEmployeeTemplate()}>
              <Download />
              {t('users.downloadTemplate')}
            </Button>
            <Button size="sm" variant="outline" className="h-9" onClick={() => fileInputRef.current?.click()}>
              <Upload />
              {t('users.import')}
            </Button>
            <Button size="sm" className="h-9" onClick={() => navigate(`${basePath}/add-users`)}>
              <Plus />
              {t('users.add')}
            </Button>
            <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" aria-hidden onChange={onFileChosen} />
          </div>
        }
      />
      <DataTable<CompanyUser>
        columns={columns}
        data={users ?? []}
        isLoading={isLoading}
        listFields={LIST_FIELDS}
        searchable
        showRowSelectionColumn={false}
        pageSize={25}
        tableId="company-users"
        configNamespace="company-users"
        getRowId={(user) => user.id}
        emptyState={listEmptyBody({
          error,
          onRetry: () => void refetch(),
          icon: <Users className="h-8 w-8 opacity-50" />,
          message: t('users.emptyTitle'),
          description: t('users.emptyBody'),
        })}
      />
      {dialog && (
        <AppDialog
          open
          onOpenChange={(next) => !next && setPending(null)}
          size="sm"
          title={dialog.title}
          description={dialog.body}
          confirmLabel={dialog.title}
          cancelLabel={t('action.cancel', { ns: 'common' })}
          confirmVariant={dialog.destructive ? 'destructive' : 'default'}
          loading={makeCompanyAdmin.isPending || removeCompanyAdmin.isPending || deleteUser.isPending}
          onConfirm={confirmPending}
        />
      )}
      {coveringFor && companyId && (
        <ExtraOrgUnitsDialog key={coveringFor.id} companyId={companyId} user={coveringFor} onClose={() => setCoveringFor(null)} />
      )}
    </div>
  )
}
