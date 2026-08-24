import { format } from 'date-fns'
import { Button } from 'primereact/button'
import { Column } from 'primereact/column'
import { DataTable } from 'primereact/datatable'
import { useRef, type ChangeEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { CompanyUser } from '@/api/users'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { useCompany } from '@/hooks/useCompanies'
import { useCompanyUsers } from '@/hooks/useUsers'
import { generateEmployeeTemplateBlob } from '@/lib/employeeTemplate'

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

  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleDownloadTemplate() {
    const blob = await generateEmployeeTemplateBlob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'wrapzzo-employee-template.xlsx'
    link.click()
    URL.revokeObjectURL(url)
  }

  function handleFileChosen(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    navigate(`/admin/companies/${companyId}/import-users`, { state: { file } })
  }

  const importActions = (
    <div className="flex flex-wrap items-center gap-2">
      <Button label="Add users" icon="pi pi-plus" outlined onClick={() => navigate(`/admin/companies/${companyId}/add-users`)} />
      <Button label="Download template" icon="pi pi-download" outlined onClick={handleDownloadTemplate} />
      <Button label="Import employees" icon="pi pi-upload" onClick={() => fileInputRef.current?.click()} />
      <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleFileChosen} />
    </div>
  )

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle={company ? `Everyone with a Wrapzzo account at ${company.name}.` : 'Everyone with a Wrapzzo account at this company.'}
        backTo={`/admin/companies/${companyId}`}
        actions={users && users.length > 0 ? importActions : undefined}
      />

      {!isLoading && users?.length === 0 ? (
        <EmptyState
          icon="pi-users"
          title="No users yet"
          description="Add users one by one, or import a whole roster from a spreadsheet."
          action={importActions}
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
