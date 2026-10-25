import { format } from 'date-fns'
import { Button } from 'primereact/button'
import { Column } from 'primereact/column'
import { DataTable } from 'primereact/datatable'
import { Dialog } from 'primereact/dialog'
import { IconField } from 'primereact/iconfield'
import { InputIcon } from 'primereact/inputicon'
import { InputText } from 'primereact/inputtext'
import { useState } from 'react'
import type { Recipient } from '@/api/recipients'
import { EmptyState } from '@/components/EmptyState'
import { useRecipientSearch } from '@/hooks/useRecipients'
import { parseDateOnly } from '@/lib/format'

/**
 * Search the shared recipient directory (an existing doctor) and pick several at once --
 * e.g. to add them straight into a Quick Gift form instead of retyping their details. Live
 * search, not a full-directory load: works for anyone who can send a gift (quickgift.create),
 * not just recipient.manage holders -- see RecipientController.search.
 */
export function RecipientPickerDialog({
  visible,
  onHide,
  onConfirm,
}: {
  visible: boolean
  onHide: () => void
  onConfirm: (recipients: Recipient[]) => void
}) {
  const [search, setSearch] = useState('')
  const { data: results, isLoading, isFetching } = useRecipientSearch(search)
  const [selected, setSelected] = useState<Recipient[]>([])
  const filtered = results ?? []

  function handleHide() {
    setSelected([])
    setSearch('')
    onHide()
  }

  function handleConfirm() {
    onConfirm(selected)
    setSelected([])
    setSearch('')
  }

  return (
    <Dialog
      header="Pick an existing doctor"
      visible={visible}
      onHide={handleHide}
      style={{ width: '48rem' }}
      breakpoints={{ '960px': '90vw', '640px': '95vw' }}
      modal
    >
      <div className="mb-3">
        <IconField iconPosition="left">
          <InputIcon className="pi pi-search" />
          <InputText
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by doctor name or phone"
            className="w-full"
            autoFocus
          />
        </IconField>
      </div>

      {search.trim().length === 0 ? (
        <EmptyState icon="pi-search" title="Start typing to search" description="Find a doctor already in your directory by name or phone." />
      ) : !isLoading && filtered.length === 0 ? (
        <EmptyState icon="pi-address-book" title="No matches" description="No doctor matches that search -- add them as a new recipient instead." />
      ) : (
        <DataTable
          value={filtered}
          selectionMode="checkbox"
          selection={selected}
          onSelectionChange={(e) => setSelected(e.value as Recipient[])}
          dataKey="id"
          loading={isFetching}
          scrollable
          scrollHeight="360px"
          tableStyle={{ minWidth: '36rem' }}
          emptyMessage="No recipients match your search."
        >
          <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} />
          <Column header="Name" field="name" style={{ minWidth: '9rem' }} />
          <Column header="Phone" field="phone" style={{ minWidth: '8rem' }} />
          <Column header="Email" body={(r: Recipient) => r.email ?? '—'} style={{ minWidth: '11rem' }} />
          <Column
            header="Date of birth"
            body={(r: Recipient) => (r.dateOfBirth ? format(parseDateOnly(r.dateOfBirth), 'dd MMM yyyy') : '—')}
            style={{ minWidth: '8rem' }}
          />
        </DataTable>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <Button label="Cancel" text onClick={handleHide} />
        <Button label={`Add ${selected.length > 0 ? selected.length : ''} selected`.trim()} disabled={selected.length === 0} onClick={handleConfirm} />
      </div>
    </Dialog>
  )
}
