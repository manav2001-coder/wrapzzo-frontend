import type { ColumnDef } from '@tanstack/react-table'
import { Pencil, Stethoscope, Trash2, Upload } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import type { Recipient } from '@/api/recipients'
import { AppDialog } from '@/components/app-dialog'
import { DataTable } from '@/components/data-table'
import { listEmptyBody } from '@/components/data-table/list-body'
import { IconButton } from '@/components/icon-button'
import { MasterPageHeader } from '@/components/masters/master-page'
import { Button } from '@/components/ui/button'
import { DoctorsImportDialog } from '@/modules/recipients/DoctorsImportDialog'
import { RecipientFormDialog } from '@/modules/recipients/RecipientFormDialog'
import { useMenuLabel } from '@/hooks/use-menu-labels'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useMyRecipients, useRemoveMyDoctor } from '@/hooks/useRecipients'
import type { ListFieldMap } from '@/lib/list-fields'

const LIST_FIELDS: ListFieldMap = { name: 'text', phone: 'text', email: 'text', registrationNumber: 'text' }

/** An MR's own doctor list: they add, edit and remove doctors themselves, with no approval step. */
export function MyDoctorsPage() {
  const { t } = useTranslation('recipients')
  const pageTitle = useMenuLabel('my-doctors', t('doctors.title'))
  const showError = useApiErrorToast()
  const { data: doctors, isLoading, error, refetch } = useMyRecipients()
  const removeDoctor = useRemoveMyDoctor()
  // `undefined` = closed, `null` = adding a new doctor, a doctor = editing them.
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
      { id: 'name', accessorKey: 'name', header: t('field.doctorName'), meta: { className: 'min-w-[180px]' } },
      {
        id: 'registrationNumber',
        accessorFn: (r) => r.doctor?.registrationNumber ?? '',
        header: t('field.registrationNumber'),
        meta: { className: 'min-w-[130px]' },
      },
      {
        id: 'speciality',
        accessorFn: (r) => r.doctor?.speciality ?? '',
        header: t('field.speciality'),
        enableColumnFilter: false,
        meta: { className: 'min-w-[130px]' },
      },
      { id: 'phone', accessorKey: 'phone', header: t('field.phone'), meta: { className: 'min-w-[130px]' } },
      { id: 'email', accessorFn: (r) => r.email ?? '', header: t('field.email'), meta: { className: 'min-w-[180px]' } },
      {
        id: 'actions',
        header: '',
        enableColumnFilter: false,
        enableSorting: false,
        meta: { className: 'w-[96px]', pin: 'right' },
        cell: ({ row }) => (
          <div className="flex justify-end gap-0.5">
            <IconButton icon={Pencil} label={t('doctors.edit', { name: row.original.name })} onClick={() => setEditing(row.original)} />
            <IconButton
              icon={Trash2}
              tone="destructive"
              label={t('doctors.remove', { name: row.original.name })}
              onClick={() => setRemoving(row.original)}
            />
          </div>
        ),
      },
    ],
    [t],
  )

  return (
    <div className="space-y-4">
      <MasterPageHeader
        title={pageTitle}
        description={t('doctors.subtitle')}
        createLabel={t('doctors.add')}
        onCreate={() => setEditing(null)}
        extra={
          <Button variant="outline" size="sm" onClick={() => setImporting(true)}>
            <Upload className="mr-1.5 h-4 w-4" />
            {t('import.button')}
          </Button>
        }
      />

      <DataTable<Recipient>
        columns={columns}
        data={doctors ?? []}
        isLoading={isLoading}
        listFields={LIST_FIELDS}
        searchable
        showRowSelectionColumn={false}
        getRowId={(r) => r.id}
        tableId="my-doctors"
        configNamespace="my-doctors"
        emptyState={listEmptyBody({
          error,
          onRetry: () => void refetch(),
          icon: <Stethoscope className="h-8 w-8 opacity-50" />,
          message: t('doctors.emptyTitle'),
          description: t('doctors.emptyBody'),
        })}
      />

      {editing !== undefined && <RecipientFormDialog key={editing?.id ?? 'new'} visible mine recipient={editing} onHide={() => setEditing(undefined)} />}
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
