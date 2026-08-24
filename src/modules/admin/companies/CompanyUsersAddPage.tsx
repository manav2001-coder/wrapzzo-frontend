import { Button } from 'primereact/button'
import { Card } from 'primereact/card'
import { InputText } from 'primereact/inputtext'
import { Message } from 'primereact/message'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { ApiError } from '@/lib/axiosClient'
import type { BulkImportUserRow } from '@/api/users'
import { PageHeader } from '@/components/PageHeader'
import { useCompany } from '@/hooks/useCompanies'
import { useBulkImportUsers } from '@/hooks/useUsers'
import { showToast } from '@/lib/toast'

interface DraftRow {
  key: number
  name: string
  email: string
  mobile: string
  designation: string
  employeeCode: string
  reportsToEmail: string
  orgUnit: string
}

function emptyRow(key: number): DraftRow {
  return { key, name: '', email: '', mobile: '', designation: '', employeeCode: '', reportsToEmail: '', orgUnit: '' }
}

// Manual quick-add only goes one org level deep -- a company that needs a full
// Division/Zone/Region hierarchy is better served by the spreadsheet import,
// which supports up to four.
const FIELD_COLUMNS: { key: keyof Omit<DraftRow, 'key'>; label: string; required: boolean; placeholder: string }[] = [
  { key: 'name', label: 'Name', required: true, placeholder: 'Jane Doe' },
  { key: 'email', label: 'Email', required: true, placeholder: 'jane@company.com' },
  { key: 'mobile', label: 'Mobile', required: true, placeholder: '9876543210' },
  { key: 'designation', label: 'Designation', required: true, placeholder: 'Sales Exec' },
  { key: 'employeeCode', label: 'Employee Code', required: true, placeholder: 'E001' },
  { key: 'reportsToEmail', label: 'Reports To Email', required: false, placeholder: 'Optional' },
  { key: 'orgUnit', label: 'Org Unit', required: true, placeholder: 'North Zone' },
]

let nextKey = 1

export function CompanyUsersAddPage() {
  const { id } = useParams<{ id: string }>()
  const companyId = id ?? ''
  const navigate = useNavigate()

  const { data: company } = useCompany(id)
  const bulkImport = useBulkImportUsers(companyId)

  const [rows, setRows] = useState<DraftRow[]>([emptyRow(nextKey++)])
  const [rowErrors, setRowErrors] = useState<string[]>([])
  const [importErrors, setImportErrors] = useState<string[]>([])
  const [resultSummary, setResultSummary] = useState<{ created: number; updated: number } | null>(null)

  function updateCell(key: number, field: keyof Omit<DraftRow, 'key'>, value: string) {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, [field]: value } : row)))
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow(nextKey++)])
  }

  function removeRow(key: number) {
    setRows((prev) => (prev.length > 1 ? prev.filter((row) => row.key !== key) : prev))
  }

  function isRowBlank(row: DraftRow) {
    return !row.name && !row.email && !row.mobile && !row.designation && !row.employeeCode && !row.reportsToEmail && !row.orgUnit
  }

  async function handleSave() {
    setRowErrors([])
    setImportErrors([])
    setResultSummary(null)

    const nonBlankRows = rows.filter((row) => !isRowBlank(row))
    if (nonBlankRows.length === 0) {
      setRowErrors(['Add at least one user before saving.'])
      return
    }

    const errors: string[] = []
    const payload: BulkImportUserRow[] = []
    nonBlankRows.forEach((row, index) => {
      const missing: string[] = []
      if (!row.name) missing.push('Name')
      if (!row.email) missing.push('Email')
      if (!row.mobile) missing.push('Mobile')
      if (!row.designation) missing.push('Designation')
      if (!row.employeeCode) missing.push('Employee Code')
      if (!row.orgUnit) missing.push('Org Unit')
      if (missing.length > 0) {
        errors.push(`Row ${index + 1}: missing required field(s): ${missing.join(', ')}.`)
        return
      }
      payload.push({
        name: row.name,
        email: row.email,
        mobile: row.mobile,
        designation: row.designation,
        employeeCode: row.employeeCode,
        reportsToEmail: row.reportsToEmail || undefined,
        orgUnitPath: [row.orgUnit],
      })
    })

    if (errors.length > 0) {
      setRowErrors(errors)
      return
    }

    try {
      const result = await bulkImport.mutateAsync(payload)
      setResultSummary({ created: result.createdCount, updated: result.updatedCount })
      setRows([emptyRow(nextKey++)])
      showToast({ severity: 'success', summary: 'Users saved', detail: `${result.createdCount} added, ${result.updatedCount} updated.` })
    } catch (error) {
      const apiError = error as ApiError
      const details = (apiError.data as { details?: string[] } | undefined)?.details
      if (details && details.length > 0) {
        setImportErrors(details)
      } else {
        showToast({ severity: 'error', summary: 'Save failed', detail: apiError.message ?? 'Something went wrong.' })
      }
    }
  }

  return (
    <div>
      <PageHeader
        title="Add users"
        subtitle={company ? `Add employees to ${company.name} directly, one row per person.` : 'Add employees directly, one row per person.'}
        backTo={`/admin/companies/${companyId}/users`}
      />

      <Card title="New users">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-muted">
            Every column is required except Reports To Email. Need a deeper org hierarchy or a bigger batch? Use{' '}
            <button
              type="button"
              className="text-accent underline-offset-2 hover:underline"
              onClick={() => navigate(`/admin/companies/${companyId}/import-users`)}
            >
              spreadsheet import
            </button>{' '}
            instead.
          </p>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[1000px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted">
                  {FIELD_COLUMNS.map((col) => (
                    <th key={col.key} className="px-3 py-2 text-left text-xs font-medium text-text-muted">
                      {col.label}
                      {col.required && <span className="text-red-500 dark:text-red-400"> *</span>}
                    </th>
                  ))}
                  <th className="w-10 px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key} className="border-b border-border last:border-b-0">
                    {FIELD_COLUMNS.map((col) => (
                      <td key={col.key} className="p-1.5">
                        <InputText
                          value={row[col.key]}
                          onChange={(e) => updateCell(row.key, col.key, e.target.value)}
                          placeholder={col.placeholder}
                          className="w-full"
                        />
                      </td>
                    ))}
                    <td className="p-1.5 text-center">
                      <Button
                        icon="pi pi-trash"
                        text
                        severity="danger"
                        disabled={rows.length === 1}
                        aria-label="Remove row"
                        onClick={() => removeRow(row.key)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <Button label="Add row" icon="pi pi-plus" outlined onClick={addRow} />
          </div>

          {rowErrors.length > 0 && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3">
              <p className="mb-2 text-sm font-medium text-red-500 dark:text-red-400">Fix these rows before saving:</p>
              <ul className="ml-4 list-disc space-y-1 text-xs text-red-500 dark:text-red-400">
                {rowErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {importErrors.length > 0 && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3">
              <p className="mb-2 text-sm font-medium text-red-500 dark:text-red-400">Save failed -- fix these rows and try again:</p>
              <ul className="ml-4 list-disc space-y-1 text-xs text-red-500 dark:text-red-400">
                {importErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {resultSummary && (
            <Message
              severity="success"
              className="w-full justify-start sm:w-auto"
              text={`Saved: ${resultSummary.created} added, ${resultSummary.updated} updated.`}
            />
          )}

          <div className="flex items-center gap-2">
            <Button label="Save users" icon="pi pi-check" loading={bulkImport.isPending} onClick={handleSave} />
            <Button label="View users" text onClick={() => navigate(`/admin/companies/${companyId}/users`)} />
          </div>
        </div>
      </Card>
    </div>
  )
}
