import { format } from 'date-fns'
import { Button } from 'primereact/button'
import { Column } from 'primereact/column'
import { DataTable } from 'primereact/datatable'
import { IconField } from 'primereact/iconfield'
import { InputIcon } from 'primereact/inputicon'
import { InputText } from 'primereact/inputtext'
import { useMemo, useState } from 'react'
import type { Recipient } from '@/api/recipients'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { useRecipients } from '@/hooks/useRecipients'
import { parseDateOnly } from '@/lib/format'
import { RecipientFormDialog } from './RecipientFormDialog'
import { UpcomingBirthdaysWidget } from './UpcomingBirthdaysWidget'

/** The company's shared recipient directory -- built up from Quick Gift requests and Campaign submissions, plus anyone added here manually. Company Admin and Member alike can view and add. */
export function RecipientsPage() {
  const { data: recipients, isLoading } = useRecipients()
  const [search, setSearch] = useState('')
  const [formVisible, setFormVisible] = useState(false)
  const [editing, setEditing] = useState<Recipient | null>(null)

  function openAddForm() {
    setEditing(null)
    setFormVisible(true)
  }

  function openEditForm(recipient: Recipient) {
    setEditing(recipient)
    setFormVisible(true)
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return recipients ?? []
    return (recipients ?? []).filter(
      (r) => r.name.toLowerCase().includes(q) || r.phone.toLowerCase().includes(q) || (r.email ?? '').toLowerCase().includes(q),
    )
  }, [recipients, search])

  return (
    <div>
      <PageHeader
        title="Recipients"
        subtitle="Everyone your team has sent a gift to or requested one for, in one shared directory."
        actions={<Button label="Add recipient" icon="pi pi-plus" onClick={openAddForm} />}
      />

      <UpcomingBirthdaysWidget />

      {!isLoading && (recipients ?? []).length === 0 ? (
        <EmptyState
          icon="pi-address-book"
          title="No recipients yet"
          description="Recipients from Quick Gift requests and Campaign submissions show up here automatically, or add one manually."
          action={<Button label="Add recipient" icon="pi pi-plus" outlined onClick={openAddForm} />}
        />
      ) : (
        <>
          <div className="mb-4">
            <IconField iconPosition="left">
              <InputIcon className="pi pi-search" />
              <InputText
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, phone, or email"
                className="w-full sm:w-80"
              />
            </IconField>
          </div>

          <DataTable value={filtered} loading={isLoading} dataKey="id" emptyMessage="No recipients match your search.">
            <Column header="Name" field="name" />
            <Column header="Phone" field="phone" />
            <Column header="Email" body={(r: Recipient) => r.email ?? '—'} />
            <Column header="Address" body={(r: Recipient) => r.address ?? '—'} />
            <Column header="Date of birth" body={(r: Recipient) => (r.dateOfBirth ? format(parseDateOnly(r.dateOfBirth), 'dd MMM yyyy') : '—')} />
            <Column header="Added by" body={(r: Recipient) => r.createdByName ?? '—'} />
            <Column
              header=""
              style={{ width: '4rem' }}
              body={(r: Recipient) => <Button icon="pi pi-pencil" text aria-label="Edit recipient" onClick={() => openEditForm(r)} />}
            />
          </DataTable>
        </>
      )}

      <RecipientFormDialog visible={formVisible} onHide={() => setFormVisible(false)} recipient={editing} />
    </div>
  )
}
