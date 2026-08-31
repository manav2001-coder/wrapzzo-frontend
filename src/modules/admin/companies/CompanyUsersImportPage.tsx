import { Button } from 'primereact/button'
import { Card } from 'primereact/card'
import { Column } from 'primereact/column'
import { DataTable } from 'primereact/datatable'
import { Dropdown } from 'primereact/dropdown'
import { FileUpload, type FileUploadSelectEvent } from 'primereact/fileupload'
import { Message } from 'primereact/message'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { ApiError } from '@/lib/axiosClient'
import type { BulkImportUserRow } from '@/api/users'
import { PageHeader } from '@/components/PageHeader'
import { useCompanyUserContext } from '@/hooks/useCompanyUserContext'
import { useBulkImportUsers } from '@/hooks/useUsers'
import {
  EMPLOYEE_FIELDS,
  buildAutoMapping,
  generateEmployeeTemplateBlob,
  getUnmappedRequiredFields,
  getWorkbookHeaders,
  parseEmployeeWorkbook,
  type ColumnMapping,
} from '@/lib/employeeTemplate'
import { showToast } from '@/lib/toast'

export function CompanyUsersImportPage() {
  const { companyId, companyName, basePath } = useCompanyUserContext()
  const navigate = useNavigate()
  const location = useLocation()

  const bulkImport = useBulkImportUsers(companyId)

  const [parsedRows, setParsedRows] = useState<BulkImportUserRow[]>([])
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [fileName, setFileName] = useState<string | null>(null)
  // PrimeReact's basic FileUpload unmounts its native <input> once a file is selected,
  // so re-clicking "Choose file" to pick a replacement silently does nothing -- remounting
  // on every pick (via this key) gives it a fresh input each time.
  const [uploadKey, setUploadKey] = useState(0)
  const [importErrors, setImportErrors] = useState<string[]>([])
  const [resultSummary, setResultSummary] = useState<{ created: number; updated: number } | null>(null)

  // Set only when the sheet doesn't already use our template's own header names --
  // holds the picked file and its headers while the user maps our fields to theirs.
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [sheetHeaders, setSheetHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState<ColumnMapping>({})

  async function handleDownloadTemplate() {
    const blob = await generateEmployeeTemplateBlob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'wrapzzo-employee-template.xlsx'
    link.click()
    URL.revokeObjectURL(url)
  }

  async function runParse(file: File, columnMapping: ColumnMapping) {
    const { rows, errors } = await parseEmployeeWorkbook(file, columnMapping)
    setParsedRows(rows)
    setParseErrors(errors)
    setPendingFile(null)
  }

  async function selectFile(file: File) {
    setFileName(file.name)
    setUploadKey((key) => key + 1)
    setImportErrors([])
    setResultSummary(null)
    setParsedRows([])
    setParseErrors([])

    const headers = await getWorkbookHeaders(file)
    if (headers.length === 0) {
      setParseErrors(['This sheet has no header row to read. Download the template to check the expected layout.'])
      return
    }

    const autoMapping = buildAutoMapping(headers)
    if (getUnmappedRequiredFields(autoMapping).length === 0) {
      // Already uses our own header names (or close enough) -- skip the mapping step entirely.
      await runParse(file, autoMapping)
      return
    }

    setSheetHeaders(headers)
    setMapping(autoMapping)
    setPendingFile(file)
  }

  // Arrives already picked -- the file chooser opens straight from the Users
  // page's "Import employees" button, so by the time we land here there's
  // nothing left for the user to click except this parse.
  useEffect(() => {
    const preselected = (location.state as { file?: File } | null)?.file
    if (preselected) {
      selectFile(preselected)
      navigate(location.pathname, { replace: true, state: null })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleFileSelect(event: FileUploadSelectEvent) {
    const file = event.files[0]
    if (!file) return
    await selectFile(file)
  }

  function updateMapping(fieldKey: string, headerText: string | null) {
    setMapping((prev) => ({ ...prev, [fieldKey]: headerText ?? undefined }))
  }

  const unmappedRequired = getUnmappedRequiredFields(mapping)

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
        subtitle={companyName ? `Bulk-add ${companyName}'s roster from a spreadsheet.` : 'Bulk-add a roster from a spreadsheet.'}
        backTo={`${basePath}/users`}
      />

      <Card title="Upload roster">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-muted">
            {pendingFile
              ? "This sheet doesn't use our template's column names. Match your columns to ours below."
              : fileName
                ? 'Review the parsed rows below, then import.'
                : "Use our template, or upload your own sheet and we'll ask you to match its columns. Every field is required except Reports To Email."}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <Button label="Download template" icon="pi pi-download" outlined onClick={handleDownloadTemplate} />
            <FileUpload
              key={uploadKey}
              mode="basic"
              name="roster"
              accept=".xlsx"
              maxFileSize={10_000_000}
              chooseLabel={fileName ?? 'Choose file'}
              onSelect={handleFileSelect}
            />
          </div>

          {pendingFile && (
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-muted p-4">
              <p className="text-sm font-medium text-text">Match "{pendingFile.name}"'s columns to our fields</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {EMPLOYEE_FIELDS.map((field) => (
                  <div key={field.key} className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-text-muted">
                      {field.label}
                      {field.required && <span className="text-red-500 dark:text-red-400"> *</span>}
                    </label>
                    <Dropdown
                      value={mapping[field.key] ?? null}
                      options={sheetHeaders}
                      onChange={(e) => updateMapping(field.key, e.value)}
                      placeholder={field.required ? 'Select a column' : 'Not in my sheet'}
                      showClear={!field.required}
                      filter
                      className="w-full"
                    />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  label="Use this mapping"
                  icon="pi pi-check"
                  disabled={unmappedRequired.length > 0}
                  onClick={() => runParse(pendingFile, mapping)}
                />
                <Button label="Choose a different file" text onClick={() => setPendingFile(null)} />
              </div>
              {unmappedRequired.length > 0 && (
                <p className="text-xs text-text-muted">
                  Still need: {unmappedRequired.map((f) => f.label).join(', ')}
                </p>
              )}
            </div>
          )}

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
                Import validation failed. Fix these rows in the sheet and re-upload:
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
              <Button label="View users" icon="pi pi-arrow-right" text onClick={() => navigate(`${basePath}/users`)} />
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
