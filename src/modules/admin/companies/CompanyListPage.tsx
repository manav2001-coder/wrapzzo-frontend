import { format } from 'date-fns'
import { Button } from 'primereact/button'
import { Column } from 'primereact/column'
import { DataTable } from 'primereact/datatable'
import { IconField } from 'primereact/iconfield'
import { InputIcon } from 'primereact/inputicon'
import { InputText } from 'primereact/inputtext'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Company } from '@/api/companies'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { useCompanies } from '@/hooks/useCompanies'

export function CompanyListPage() {
  const { data: companies, isLoading } = useCompanies()
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const filtered = useMemo(() => {
    if (!companies) return []
    const query = search.trim().toLowerCase()
    if (!query) return companies
    return companies.filter((company) => company.name.toLowerCase().includes(query))
  }, [companies, search])

  return (
    <div>
      <PageHeader
        title="Companies"
        subtitle="Onboard and manage the corporates that buy through Wrapzzo."
        actions={
          <Button label="Add company" icon="pi pi-plus" onClick={() => navigate('/admin/companies/new')} />
        }
      />

      <div className="mb-4">
        <IconField iconPosition="left">
          <InputIcon className="pi pi-search" />
          <InputText
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search companies"
            className="w-full sm:w-80"
          />
        </IconField>
      </div>

      {!isLoading && companies?.length === 0 ? (
        <EmptyState
          icon="pi-building"
          title="No companies yet"
          description="Onboard your first corporate customer to get started."
          action={<Button label="Add company" icon="pi pi-plus" onClick={() => navigate('/admin/companies/new')} />}
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
            emptyMessage="No companies match your search."
            className="min-w-[640px]"
            onRowClick={(event) => navigate(`/admin/companies/${(event.data as Company).id}`)}
            rowClassName={() => 'cursor-pointer'}
          >
            <Column header="ID" body={(row: Company) => <span className="font-mono text-xs text-text-muted">{row.displayId}</span>} style={{ width: '96px' }} />
            <Column
              header="Company"
              body={(row: Company) => (
                <div className="flex items-center gap-3">
                  {row.logoUrl ? (
                    <img src={row.logoUrl} alt="" className="h-8 w-8 rounded-md object-cover" />
                  ) : (
                    <div className="grid h-8 w-8 place-items-center rounded-md bg-surface-muted text-xs font-semibold text-text-muted">
                      {row.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="font-medium text-text">{row.name}</span>
                </div>
              )}
            />
            <Column header="Status" body={(row: Company) => <StatusBadge status={row.status} />} style={{ width: '140px' }} />
            <Column
              header="Onboarded"
              body={(row: Company) => format(new Date(row.createdAt), 'dd MMM yyyy')}
              style={{ width: '160px' }}
            />
            <Column
              header=""
              body={(row: Company) => (
                <Link to={`/admin/companies/${row.id}`} onClick={(event) => event.stopPropagation()}>
                  <Button icon="pi pi-arrow-right" text rounded aria-label="View company" />
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
