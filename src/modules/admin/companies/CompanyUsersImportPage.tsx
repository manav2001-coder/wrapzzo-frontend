import { Button } from 'primereact/button'
import { Card } from 'primereact/card'
import { Column } from 'primereact/column'
import { DataTable } from 'primereact/datatable'
import { FileUpload, type FileUploadSelectEvent } from 'primereact/fileupload'
import { Message } from 'primereact/message'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { ApiError } from '@/lib/axiosClient'
import type { BulkImportUserRow } from '@/api/users'
import { PageHeader } from '@/components/PageHeader'
import { useCompany } from '@/hooks/useCompanies'
import { useBulkImportUsers } from '@/hooks/useUsers'
import { generateEmployeeTemplateBlob, parseEmployeeWorkbook } from '@/lib/employeeTemplate'
import { showToast } from '@/lib/toast'

export function CompanyUsersImportPage() {
  const { id } = useParams<{ id: string }>()
  const companyId = id ?? ''
  const navigate = useNavigate()

  const { data: company } = useCompany(id)
  const bulkImport = useBulkImportUsers(companyId)

  const [parsedRows, setParsedRows] = useState<BulkImportUserRow[]>([])
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [fileName, setFileName] = useState<string | null>(null)
  const [importErrors, setImportErrors] = useState<string[]>([])
  const [resultSummary, setResultSummary] = useState<{ created: number; updated: number } | null>(null)

  async function handleDownloadTemplate() {
    const blob = await generateEmployeeTemplateBlob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'wrapzzo-employee-template.xlsx'
    link.click()
    URL.revokeObjectURL(url)
  }

  async function handleFileSelect(event: FileUploadSelectEvent) {
    const file = event.files[0]
    if (!file) return
    setFileName(file.name)
    setImportErrors([])
    setResultSummary(null)
    const { rows, errors } = await parseEmployeeWorkbook(file)
    setParsedRows(rows)
    setParseErrors(errors)
  }

  async function handleImport() {
    setImportErrors([])
    try {
      const result = await bulkImport.mutateAsync(parsedRows)
      setResultSummary({ created: result.createdCount, updated: result.updatedCount })
      setParsedRows([])
      setFileName(null)
      showToast({ severity: 'success', summary: 'Import complete', detail: `${result.createdCount} added, ${result.updatedCount} updated.` })
    } catch (error) {
      const apiError = error as ApiError
      const details = (apiError.data as { details?: string[] } | undefined)?.details
      if (details && details.length > 0) {
        setImportErrors(details)
      } else {
        showToast({ severity: 'error', summary: 'Import failed', detail: apiError.message ?? 'Something went wrong.' })
      }
    }
  }

  return (
    <div>
      <PageHeader
        title="Import employees"
        subtitle={company ? `Bulk-add ${company.name}'s roster from a spreadsheet.` : 'Bulk-add a roster from a spreadsheet.'}
        backTo={`/admin/companies/${companyId}/users`}
      />

      <Card title="Upload roster">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-muted">
            Download the template, fill in one row per employee (Name and Email are required; everything else is
            optional), then upload it here.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <Button label="Download template" icon="pi pi-download" outlined onClick={handleDownloadTemplate} />
            <FileUpload
              mode="basic"
              name="roster"
              accept=".xlsx"
              maxFileSize={10_000_000}
              chooseLabel={fileName ?? 'Choose file'}
              onSelect={handleFileSelect}
            />
          </div>

          {parseErrors.length > 0 && (
            <Message
              severity="error"
              className="w-full justify-start"
              text={`This sheet has ${parseErrors.length} row problem(s): ${parseErrors.slice(0, 3).join(' ')}${parseErrors.length > 3 ? ' ...' : ''}`}
            />
          )}

          {importErrors.length > 0 && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3">
              <p className="mb-2 text-sm font-medium text-red-500 dark:text-red-400">
                Import validation failed -- fix these rows in the sheet and re-upload:
              </p>
              <ul className="ml-4 list-disc space-y-1 text-xs text-red-500 dark:text-red-400">
                {importErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {resultSummary && (
            <div className="flex flex-wrap items-center gap-3">
              <Message
                severity="success"
                className="w-full justify-start sm:w-auto"
                text={`Imported: ${resultSummary.created} added, ${resultSummary.updated} updated.`}
              />
              <Button label="View users" icon="pi pi-arrow-right" text onClick={() => navigate(`/admin/companies/${companyId}/users`)} />
            </div>
          )}

          {parsedRows.length > 0 && (
            <>
              <div className="max-h-96 overflow-y-auto rounded-lg border border-border">
                <DataTable value={parsedRows.slice(0, 200)} size="small" scrollable>
                  <Column header="Name" field="name" />
                  <Column header="Email" field="email" />
                  <Column header="Mobile" field="mobile" />
                  <Column header="Designation" field="designation" />
                  <Column header="Employee code" field="employeeCode" />
                  <Column header="Reports to" field="reportsToEmail" />
                  <Column header="Org path" body={(row: BulkImportUserRow) => row.orgUnitPath?.join(' -> ') ?? '—'} />
                </DataTable>
              </div>
              <div className="flex items-center gap-2">
                <Button label={`Import ${parsedRows.length} employee(s)`} loading={bulkImport.isPending} onClick={handleImport} />
                {parsedRows.length > 200 && (
                  <span className="text-xs text-text-muted">Showing first 200 rows of {parsedRows.length}.</span>
                )}
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  )
}
