import type { ColumnDef } from '@tanstack/react-table'
import { Contact, Pencil } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { Recipient } from '@/api/recipients'
import { DataTable } from '@/components/data-table'
import { listEmptyBody } from '@/components/data-table/list-body'
import { IconButton } from '@/components/icon-button'
import { MasterPageHeader } from '@/components/masters/master-page'
import { useRecipients } from '@/hooks/useRecipients'
import { formatDateOnly } from '@/lib/datetime'
import type { ListFieldMap } from '@/lib/list-fields'
import { RecipientFormDialog } from './RecipientFormDialog'
import { UpcomingBirthdaysWidget } from './UpcomingBirthdaysWidget'

const LIST_FIELDS: ListFieldMap = {
  name: 'text',
  phone: 'text',
  email: 'text',
  registrationNumber: 'text',
  createdByName: 'text',
}

/** The company's shared recipient directory -- fed by Quick Gift and campaigns, plus anyone added here. */
export function RecipientsPage() {
  const { t } = useTranslation('recipients')
  const { data: recipients, isLoading, error, refetch } = useRecipients()
  // `undefined` = closed, `null` = adding, a recipient = editing it.
  const [editing, setEditing] = useState<Recipient | null | undefined>(undefined)

  const columns = useMemo<ColumnDef<Recipient, unknown>[]>(
    () => [
      { id: 'name', accessorKey: 'name', header: t('field.name'), meta: { className: 'min-w-[180px]', align: 'left' } },
      { id: 'phone', accessorKey: 'phone', header: t('field.phone'), meta: { className: 'min-w-[130px]' } },
      { id: 'email', accessorFn: (r) => r.email ?? '', header: t('field.email'), meta: { className: 'min-w-[180px]' } },
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
        meta: { className: 'w-[56px]', pin: 'right' },
        cell: ({ row }) => <IconButton icon={Pencil} label={t('directory.edit', { name: row.original.name })} onClick={() => setEditing(row.original)} />,
      },
    ],
    [t],
  )

  return (
    <div>
      <MasterPageHeader
        title={t('directory.title')}
        description={t('directory.subtitle')}
        createLabel={t('directory.add')}
        onCreate={() => setEditing(null)}
      />
      <UpcomingBirthdaysWidget />
      <DataTable<Recipient>
        columns={columns}
        data={recipients ?? []}
        isLoading={isLoading}
        listFields={LIST_FIELDS}
        searchable
        showRowSelectionColumn={false}
        getRowId={(r) => r.id}
        tableId="recipients"
        configNamespace="recipients"
        emptyState={listEmptyBody({
          error,
          onRetry: () => void refetch(),
          icon: <Contact className="h-8 w-8 opacity-50" />,
          message: t('directory.emptyTitle'),
          description: t('directory.emptyBody'),
        })}
      />
      {editing !== undefined && (
        <RecipientFormDialog key={editing?.id ?? 'new'} visible recipient={editing} onHide={() => setEditing(undefined)} />
      )}
    </div>
  )
}
