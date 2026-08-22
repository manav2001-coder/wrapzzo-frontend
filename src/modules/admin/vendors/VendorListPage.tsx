import { format } from 'date-fns'
import { Button } from 'primereact/button'
import { Column } from 'primereact/column'
import { DataTable } from 'primereact/datatable'
import { IconField } from 'primereact/iconfield'
import { InputIcon } from 'primereact/inputicon'
import { InputText } from 'primereact/inputtext'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Vendor } from '@/api/vendors'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { useVendors } from '@/hooks/useVendors'

export function VendorListPage() {
  const { data: vendors, isLoading } = useVendors()
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const filtered = useMemo(() => {
    if (!vendors) return []
    const query = search.trim().toLowerCase()
    if (!query) return vendors
    return vendors.filter(
      (vendor) => vendor.name.toLowerCase().includes(query) || vendor.contactEmail.toLowerCase().includes(query),
    )
  }, [vendors, search])

  return (
    <div>
      <PageHeader
        title="Vendors"
        subtitle="Onboard and manage the fulfillment partners who produce and dispatch orders."
        actions={<Button label="Add vendor" icon="pi pi-plus" onClick={() => navigate('/admin/vendors/new')} />}
      />

      <div className="mb-4">
        <IconField iconPosition="left">
          <InputIcon className="pi pi-search" />
          <InputText
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search vendors"
            className="w-full sm:w-80"
          />
        </IconField>
      </div>

      {!isLoading && vendors?.length === 0 ? (
        <EmptyState
          icon="pi-truck"
          title="No vendors yet"
          description="Onboard your first fulfillment partner to start assigning production work."
          action={<Button label="Add vendor" icon="pi pi-plus" onClick={() => navigate('/admin/vendors/new')} />}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <DataTable
            value={filtered}
            loading={isLoading}
            dataKey="id"
            paginator
            rows={10}
            rowsPerPageOptions={[10, 25, 50]}
            emptyMessage="No vendors match your search."
            className="min-w-[720px]"
            onRowClick={(event) => navigate(`/admin/vendors/${(event.data as Vendor).id}`)}
            rowClassName={() => 'cursor-pointer'}
          >
            <Column
              header="Vendor"
              body={(row: Vendor) => <span className="font-medium text-text">{row.name}</span>}
            />
            <Column header="Contact email" field="contactEmail" />
            <Column header="Phone" body={(row: Vendor) => row.contactPhone ?? '—'} />
            <Column header="Status" body={(row: Vendor) => <StatusBadge status={row.status} />} style={{ width: '140px' }} />
            <Column
              header="Onboarded"
              body={(row: Vendor) => format(new Date(row.createdAt), 'dd MMM yyyy')}
              style={{ width: '160px' }}
            />
            <Column
              header=""
              body={(row: Vendor) => (
                <Link to={`/admin/vendors/${row.id}`} onClick={(event) => event.stopPropagation()}>
                  <Button icon="pi pi-arrow-right" text rounded aria-label="View vendor" />
                </Link>
              )}
              style={{ width: '56px' }}
            />
          </DataTable>
        </div>
      )}
    </div>
  )
}
