import type { ColumnDef } from '@tanstack/react-table'
import { Contact, Pencil, Trash2, Upload } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { toast } from 'sonner'

import type { Recipient } from '@/api/recipients'
import { AppDialog } from '@/components/app-dialog'
import { DataTable } from '@/components/data-table'
import { EmptyTable } from '@/components/data-table/empty-table'
import { IconButton } from '@/components/icon-button'
import { MasterPageHeader } from '@/components/masters/master-page'
import { Button } from '@/components/ui/button'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useMenuLabel } from '@/hooks/use-menu-labels'
import { useRemoveMyDoctor } from '@/hooks/useRecipients'
import { serverFetcher } from '@/lib/server-list'
import { formatDateOnly } from '@/lib/datetime'
import type { ListFieldMap } from '@/lib/list-fields'
import { DoctorsImportDialog } from './DoctorsImportDialog'
import { RecipientFormDialog } from './RecipientFormDialog'
import { UpcomingBirthdaysWidget } from './UpcomingBirthdaysWidget'
import { useHasAccess } from '@/hooks/use-permission'
import { P } from '@/lib/permissions'

const LIST_FIELDS: ListFieldMap = {
  pcode: 'text',
  name: 'text',
  phone: 'text',
  email: 'text',
  createdByName: 'text',
}

/** The Doctors list is paged, searched and sorted by the server: only the page on screen is ever loaded. */
const fetchRecipients = serverFetcher<Recipient>('/api/recipients/page')

/**
 * The one Doctors screen. A field user (AM, MR) sees the doctors they added or are mapped to; a manager sees the
 * doctors of their org units -- their region, their zone -- as well (which doctors is decided by the API, see
 * Visibility). What each person can do with them is decided by the doctor.* keys: add, edit, remove from their
 * own list, bulk upload.
 */
export function RecipientsPage() {
  const { t } = useTranslation('recipients')
  const pageTitle = useMenuLabel('recipients', t('directory.title'))
  const showError = useApiErrorToast()
  const removeDoctor = useRemoveMyDoctor()
  const canEdit = useHasAccess(P.DOCTOR_EDIT)
  const canRemove = useHasAccess(P.DOCTOR_REMOVE)
  const canImport = useHasAccess(P.DOCTOR_IMPORT)
  // `undefined` = closed, `null` = adding, a recipient = editing it.
  const [editing, setEditing] = useState<Recipient | null | undefined>(undefined)
  const [removing, setRemoving] = useState<Recipient | null>(null)
  const [importing, setImporting] = useState(false)

  async function confirmRemove() {
    if (!removing) return
    try {
      await removeDoctor.mutateAsync(removing.id)
      toast.success(t('doctors.removed'))
    } catch (err) {
      showError(err)
    } finally {
      setRemoving(null)
    }
  }

  const columns = useMemo<ColumnDef<Recipient, unknown>[]>(
    () => [
      { id: 'pcode', accessorFn: (r) => r.pcode ?? '', header: t('field.pcode'), meta: { className: 'min-w-[110px]' } },
      { id: 'name', accessorKey: 'name', header: t('field.name'), meta: { className: 'min-w-[180px]' } },
      { id: 'phone', accessorKey: 'phone', header: t('field.phone'), meta: { className: 'min-w-[130px]' } },
      { id: 'email', accessorFn: (r) => r.email ?? '', header: t('field.email'), meta: { className: 'min-w-[180px]' } },
      {
        id: 'speciality',
        accessorFn: (r) => r.doctor?.speciality ?? '',
        header: t('field.speciality'),
        enableColumnFilter: false,
        meta: { className: 'min-w-[130px]' },
      },
      {
        id: 'dateOfBirth',
        accessorKey: 'dateOfBirth',
        header: t('field.dob'),
        enableColumnFilter: false,
        meta: { className: 'min-w-[120px]' },
        cell: ({ row }) => formatDateOnly(row.original.dateOfBirth),
      },
      { id: 'createdByName', accessorFn: (r) => r.createdByName ?? '', header: t('field.addedBy'), meta: { className: 'min-w-[140px]' } },
      {
        id: 'actions',
        header: '',
        enableColumnFilter: false,
        enableSorting: false,
        meta: { className: 'w-[96px]', pin: 'right' },
        cell: ({ row }) => (
          <div className="flex justify-end gap-0.5">
            {canEdit && <IconButton icon={Pencil} label={t('directory.edit', { name: row.original.name })} onClick={() => setEditing(row.original)} />}
            {canRemove && row.original.inMyList && (
              <IconButton
                icon={Trash2}
                tone="destructive"
                label={t('doctors.remove', { name: row.original.name })}
                onClick={() => setRemoving(row.original)}
              />
            )}
          </div>
        ),
      },
    ],
    [t, canEdit, canRemove],
  )

  return (
    <div>
      <MasterPageHeader
        title={pageTitle}
        description={t('directory.subtitle')}
        createLabel={t('directory.add')}
        createPermission={P.DOCTOR_CREATE}
        onCreate={() => setEditing(null)}
        extra={
          canImport && (
            <Button variant="outline" size="sm" onClick={() => setImporting(true)}>
              <Upload className="mr-1.5 h-4 w-4" />
              {t('import.button')}
            </Button>
          )
        }
      />
      <UpcomingBirthdaysWidget />
      <DataTable<Recipient>
        columns={columns}
        fetchData={fetchRecipients}
        listFields={LIST_FIELDS}
        searchable
        showRowSelectionColumn={false}
        getRowId={(r) => r.id}
        tableId="recipients"
        configNamespace="recipients"
        defaultSort={{ id: 'name' }}
        emptyState={<EmptyTable icon={<Contact className="h-8 w-8 opacity-50" />} message={t('directory.emptyTitle')} description={t('directory.emptyBody')} />}
      />
      {editing !== undefined && (
        <RecipientFormDialog key={editing?.id ?? 'new'} visible recipient={editing} onHide={() => setEditing(undefined)} />
      )}
      <DoctorsImportDialog open={importing} onOpenChange={setImporting} />
      <AppDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        size="sm"
        title={removing ? t('doctors.removeTitle', { name: removing.name }) : ''}
        description={t('doctors.removeBody')}
        confirmLabel={t('doctors.removeConfirm')}
        confirmVariant="destructive"
        cancelLabel={t('action.cancel', { ns: 'common' })}
        loading={removeDoctor.isPending}
        onConfirm={() => void confirmRemove()}
      />
    </div>
  )
}
