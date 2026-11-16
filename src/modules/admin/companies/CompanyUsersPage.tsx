import type { ColumnDef } from '@tanstack/react-table'
import { Building, Download, Link2, Network, Plus, Send, ShieldMinus, ShieldPlus, Trash2, Upload, Users } from 'lucide-react'
import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import type { CompanyUser } from '@/api/users'
import { useAppSelector } from '@/app/hooks'
import { AppDialog } from '@/components/app-dialog'
import { DataTable } from '@/components/data-table'
import { EmptyTable } from '@/components/data-table/empty-table'
import { serverFetcher } from '@/lib/server-list'
import { IconButton } from '@/components/icon-button'
import { MobileRowCard } from '@/components/mobile-row-card'
import { MasterPageHeader, StatusCell, useAuditColumns } from '@/components/masters/master-page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useHasAccess, usePermissions } from '@/hooks/use-permission'
import { useCompanyUserContext } from '@/hooks/useCompanyUserContext'
import { useDeleteUser, useMakeCompanyAdmin, useResendInvite, useSetCompanyWide, useSetupLink } from '@/hooks/useUsers'
import { downloadEmployeeTemplate } from '@/lib/employeeTemplate'
import type { ListFieldMap } from '@/lib/list-fields'
import { P } from '@/lib/permissions'
import { RemoveAdminDialog } from './RemoveAdminDialog'
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
  addedOn: 'date',
  addedByName: 'text',
  updatedOn: 'date',
  updatedByName: 'text',
}

type PendingAction = { kind: 'makeAdmin' | 'wholeCompany' | 'ownUnit' | 'delete' | 'resend' | 'copyLink'; user: CompanyUser }

export function CompanyUsersPage() {
  const { t } = useTranslation('admin')
  const { auditColumns } = useAuditColumns<CompanyUser>()
  const { companyId, companyName, scope, addPath, importPath } = useCompanyUserContext()
  const navigate = useNavigate()
  const currentUserId = useAppSelector((state) => state.auth.user?.sub)
  const showError = useApiErrorToast()

  // Paged, searched, filtered and sorted by the server: only the page on screen is loaded, however many people the company has.
  const fetchUsers = useMemo(() => serverFetcher<CompanyUser>(`/api/platform/companies/${companyId}/users/page`), [companyId])
  const makeCompanyAdmin = useMakeCompanyAdmin(companyId)
  const deleteUser = useDeleteUser(companyId)
  const setCompanyWide = useSetCompanyWide(companyId)
  const resendInvite = useResendInvite(companyId)
  const setupLink = useSetupLink(companyId)
  const canCreate = useHasAccess(P.USER_CREATE)
  const canDelete = useHasAccess(P.USER_DELETE)
  // Changing who sees what takes user.edit AND seeing the whole company yourself (the API refuses
  // anyone else), so a regional manager can't widen their own reach.
  const canEditUsers = useHasAccess(P.USER_EDIT)
  const { companyWide } = usePermissions()
  const canPlace = canEditUsers && companyWide
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<PendingAction | null>(null)
  const [coveringFor, setCoveringFor] = useState<CompanyUser | null>(null)
  const [removingAdminFor, setRemovingAdminFor] = useState<CompanyUser | null>(null)
  // A setup link the browser would not let us copy, shown so the admin can copy it by hand.
  const [shownLink, setShownLink] = useState<{ name: string; url: string } | null>(null)

  const company = companyName ?? t('users.thisCompany')

  async function confirmPending() {
    if (!pending) return
    const { kind, user } = pending
    try {
      if (kind === 'makeAdmin') {
        await makeCompanyAdmin.mutateAsync(user.id)
        toast.success(t('users.madeAdmin', { name: user.name }))
      } else if (kind === 'resend') {
        await resendInvite.mutateAsync(user.id)
        toast.success(t('users.invite.sent', { name: user.name, email: user.email }))
      } else if (kind === 'copyLink') {
        const link = await setupLink.mutateAsync(user.id)
        try {
          await navigator.clipboard.writeText(link.setupUrl)
          toast.success(t('users.invite.linkCopied', { name: user.name }))
        } catch {
          setShownLink({ name: user.name, url: link.setupUrl })
        }
      } else if (kind === 'wholeCompany' || kind === 'ownUnit') {
        await setCompanyWide.mutateAsync({ userId: user.id, companyWide: kind === 'wholeCompany' })
        toast.success(t(kind === 'wholeCompany' ? 'users.wholeCompany.set' : 'users.wholeCompany.cleared', { name: user.name }))
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
    if (file) navigate(importPath, { state: { file } })
  }

  /** The buttons for what you may do with a person -- the same in the table's last column and on a phone card. */
  function userActions(user: CompanyUser, onPhone = false) {
    const isAdmin = user.roleName === COMPANY_ADMIN_ROLE_NAME
    const waiting = user.status === 'INVITED'
    return (
      <div className="flex items-center justify-end gap-0.5">
        {/* Someone who has not set up gets a new email, or a link to pass on. Someone who has set up has nothing to resend: the
            button stays in the table, greyed out and saying why, and is left off a phone card where it would only take room. */}
        {canEditUsers && (waiting || !onPhone) && (
          <IconButton
            icon={Send}
            label={t('users.invite.resend')}
            tooltip={waiting ? undefined : t('users.invite.alreadySetUp')}
            disabled={!waiting}
            onClick={() => setPending({ kind: 'resend', user })}
          />
        )}
        {canPlace && waiting && <IconButton icon={Link2} label={t('users.invite.copyLink')} onClick={() => setPending({ kind: 'copyLink', user })} />}
        {canPlace && (
          <>
            {!user.companyWide && <IconButton icon={Network} label={t('users.extraUnits.action')} onClick={() => setCoveringFor(user)} />}
            <IconButton
              icon={Building}
              label={user.companyWide ? t('users.wholeCompany.clear') : t('users.wholeCompany.make')}
              onClick={() => setPending({ kind: user.companyWide ? 'ownUnit' : 'wholeCompany', user })}
            />
            {isAdmin ? (
              <IconButton icon={ShieldMinus} label={t('users.removeAdmin')} onClick={() => setRemovingAdminFor(user)} />
            ) : (
              <IconButton icon={ShieldPlus} label={t('users.makeAdmin')} onClick={() => setPending({ kind: 'makeAdmin', user })} />
            )}
          </>
        )}
        {canDelete && user.id !== currentUserId && (
          <IconButton icon={Trash2} label={t('users.delete')} tone="destructive" onClick={() => setPending({ kind: 'delete', user })} />
        )}
      </div>
    )
  }

  /** A person as a compact card on a phone: name and status, how to reach them, where they sit and their access, then the buttons. */
  const userCard = (user: CompanyUser) => {
    const hasActions = canDelete || canPlace || (canEditUsers && user.status === 'INVITED')
    return (
      <MobileRowCard
        title={user.name}
        trailing={<StatusCell active={user.status === 'ACTIVE'} label={t(`users.status.${user.status}`)} />}
        lines={[
          user.email ? <span key="e" className="block truncate">{user.email}</span> : null,
          [user.designation, user.employeeCode].filter(Boolean).join(' · '),
          <span key="u" className="flex flex-wrap items-center gap-1.5">
            {user.companyWide ? <Badge variant="default">{t('users.wholeCompany.badge')}</Badge> : user.orgUnitName}
            {user.extraOrgUnits.length > 0 && <Badge variant="secondary-soft">{t('users.extraUnits.more', { count: user.extraOrgUnits.length })}</Badge>}
            <Badge variant={user.roleName === COMPANY_ADMIN_ROLE_NAME ? 'default' : 'secondary'}>{user.roleName}</Badge>
          </span>,
        ]}
        footer={hasActions ? userActions(user, true) : undefined}
      />
    )
  }

  const columns = useMemo<ColumnDef<CompanyUser, unknown>[]>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: t('users.column.name'),
        meta: { className: 'min-w-[200px]' },
        cell: ({ row }) => (
          <span className="flex items-center justify-center gap-2.5 font-medium">
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
            <span className="flex items-center justify-center gap-1.5" title={extra.map((unit) => unit.name).join(', ') || undefined}>
              {row.original.companyWide ? <Badge variant="default">{t('users.wholeCompany.badge')}</Badge> : (row.original.orgUnitName ?? '—')}
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
      ...auditColumns,
      {
        id: 'actions',
        header: t('field.actions', { ns: 'common' }),
        enableColumnFilter: false,
        enableSorting: false,
        meta: { className: 'min-w-[140px]', pin: 'right' },
        cell: ({ row }) => userActions(row.original),
      },
    ],
    [t, auditColumns, currentUserId, canPlace, canDelete, canEditUsers],
  )

  const dialog = pending && {
    makeAdmin: { title: t('users.makeAdmin'), body: t('users.makeAdminBody', { name: pending.user.name, company }), destructive: false },
    wholeCompany: { title: t('users.wholeCompany.make'), body: t('users.wholeCompany.makeBody', { name: pending.user.name, company }), destructive: false },
    ownUnit: {
      title: t('users.wholeCompany.clear'),
      body: t('users.wholeCompany.clearBody', { name: pending.user.name, unit: pending.user.orgUnitName ?? t('users.extraUnits.noOwnUnit') }),
      destructive: false,
    },
    delete: { title: t('users.delete'), body: t('users.deleteBody', { name: pending.user.name }), destructive: true },
    resend: { title: t('users.invite.resend'), body: t('users.invite.resendBody', { name: pending.user.name, email: pending.user.email }), destructive: false },
    copyLink: { title: t('users.invite.copyLink'), body: t('users.invite.copyLinkBody', { name: pending.user.name }), destructive: false },
  }[pending.kind]

  return (
    <div>
      <MasterPageHeader
        title={t('users.title')}
        description={companyName ? t('users.subtitle', { company: companyName }) : t('users.subtitleNoName')}
        extra={
          <div className="flex flex-wrap items-end gap-2">
            {scope.control}
            <Button size="sm" variant="outline" className="h-9" onClick={() => void downloadEmployeeTemplate()}>
              <Download />
              {t('users.downloadTemplate')}
            </Button>
            {canCreate && companyId && (
              <>
                <Button size="sm" variant="outline" className="h-9" onClick={() => fileInputRef.current?.click()}>
                  <Upload />
                  {t('users.import')}
                </Button>
                <Button size="sm" className="h-9" onClick={() => navigate(addPath)}>
                  <Plus />
                  {t('users.add')}
                </Button>
              </>
            )}
            <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" aria-hidden onChange={onFileChosen} />
          </div>
        }
      />
      <DataTable<CompanyUser>
        columns={columns}
        fetchData={fetchUsers}
        listFields={LIST_FIELDS}
        searchable
        showRowSelectionColumn={false}
        renderMobileCard={userCard}
        pageSize={25}
        tableId={`company-users-${companyId}`}
        configNamespace="company-users"
        getRowId={(user) => user.id}
        emptyState={<EmptyTable icon={<Users className="h-8 w-8 opacity-50" />} message={t('users.emptyTitle')} description={t('users.emptyBody')} />}
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
          loading={makeCompanyAdmin.isPending || setCompanyWide.isPending || deleteUser.isPending || resendInvite.isPending || setupLink.isPending}
          onConfirm={confirmPending}
        />
      )}
      {shownLink && (
        <AppDialog
          open
          onOpenChange={(next) => !next && setShownLink(null)}
          size="sm"
          title={t('users.invite.linkTitle', { name: shownLink.name })}
          description={t('users.invite.linkManual')}
          confirmLabel={t('action.close', { ns: 'common' })}
          cancelLabel={t('action.close', { ns: 'common' })}
          onConfirm={() => setShownLink(null)}
        >
          <input readOnly value={shownLink.url} aria-label={t('users.invite.copyLink')} className="w-full rounded-md border bg-muted p-2 text-xs" onFocus={(e) => e.currentTarget.select()} />
        </AppDialog>
      )}
      {removingAdminFor && companyId && <RemoveAdminDialog key={removingAdminFor.id} companyId={companyId} user={removingAdminFor} onClose={() => setRemovingAdminFor(null)} />}
      {coveringFor && companyId && (
        <ExtraOrgUnitsDialog key={coveringFor.id} companyId={companyId} user={coveringFor} onClose={() => setCoveringFor(null)} />
      )}
    </div>
  )
}
