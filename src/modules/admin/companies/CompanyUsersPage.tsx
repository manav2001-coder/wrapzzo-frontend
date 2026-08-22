import { format } from 'date-fns'
import { Button } from 'primereact/button'
import { Column } from 'primereact/column'
import { DataTable } from 'primereact/datatable'
import { useNavigate, useParams } from 'react-router-dom'
import type { CompanyUser } from '@/api/users'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { useCompany } from '@/hooks/useCompanies'
import { useCompanyUsers } from '@/hooks/useUsers'

const STATUS_LABEL: Record<CompanyUser['status'], string> = {
  ACTIVE: 'Active',
  INVITED: 'Invited',
  SUSPENDED: 'Suspended',
}

export function CompanyUsersPage() {
  const { id } = useParams<{ id: string }>()
  const companyId = id ?? ''
  const navigate = useNavigate()

  const { data: company } = useCompany(id)
  const { data: users, isLoading } = useCompanyUsers(companyId)

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle={company ? `Everyone with a Wrapzzo account at ${company.name}.` : 'Everyone with a Wrapzzo account at this company.'}
        backTo={`/admin/companies/${companyId}`}
        actions={
          users && users.length > 0 ? (
            <Button label="Import employees" icon="pi pi-upload" onClick={() => navigate(`/admin/companies/${companyId}/import-users`)} />
          ) : undefined
        }
      />

      {!isLoading && users?.length === 0 ? (
        <EmptyState
          icon="pi-users"
          title="No users yet"
          description="Import a roster spreadsheet to add this company's employees."
          action={<Button label="Import employees" icon="pi pi-upload" onClick={() => navigate(`/admin/companies/${companyId}/import-users`)} />}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <DataTable
            value={users}
            loading={isLoading}
            dataKey="id"
            paginator
            rows={25}
            rowsPerPageOptions={[25, 50, 100]}
            emptyMessage="No users match."
            className="min-w-[960px]"
          >
            <Column header="Name" field="name" />
            <Column header="Email" field="email" />
            <Column header="Mobile" body={(row: CompanyUser) => row.mobile ?? '—'} />
            <Column header="Designation" body={(row: CompanyUser) => row.designation ?? '—'} />
            <Column header="Employee code" body={(row: CompanyUser) => row.employeeCode ?? '—'} />
            <Column header="Reports to" body={(row: CompanyUser) => row.reportsToName ?? '—'} />
            <Column header="Org unit" body={(row: CompanyUser) => row.orgUnitName ?? '—'} />
            <Column
              header="Status"
              body={(row: CompanyUser) => (
                <StatusBadge status={row.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE'} label={STATUS_LABEL[row.status]} />
              )}
              style={{ width: '120px' }}
            />
            <Column header="Added" body={(row: CompanyUser) => format(new Date(row.createdAt), 'dd MMM yyyy')} style={{ width: '130px' }} />
          </DataTable>
        </div>
      )}
    </div>
  )
}
