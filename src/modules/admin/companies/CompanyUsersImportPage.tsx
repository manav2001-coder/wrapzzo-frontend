import type { ColumnDef } from '@tanstack/react-table'
import { ArrowLeft, ArrowRight, Download, Loader2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import type { BulkImportUserRow } from '@/api/users'
import { DataTable } from '@/components/data-table'
import { Combobox } from '@/components/fields/combobox'
import { FileDropzone } from '@/components/file-dropzone'
import { IconButton } from '@/components/icon-button'
import { MasterPageHeader } from '@/components/masters/master-page'
import { SectionCard } from '@/components/section-card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useCompanyUserContext } from '@/hooks/useCompanyUserContext'
import { useBulkImportUsers } from '@/hooks/useUsers'
import { ApiError } from '@/lib/axiosClient'
import {
  EMPLOYEE_FIELDS,
  buildAutoMapping,
  downloadEmployeeTemplate,
  getUnmappedRequiredFields,
  getWorkbookHeaders,
  isCompanyWidePlacement,
  parseEmployeeWorkbook,
  type ColumnMapping,
} from '@/lib/employeeTemplate'
import { ErrorList } from './ErrorList'

const XLSX_ACCEPT = { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }

export function CompanyUsersImportPage() {
  const { t } = useTranslation('admin')
  const { companyId, basePath } = useCompanyUserContext()
  const navigate = useNavigate()
  const location = useLocation()
  const bulkImport = useBulkImportUsers(companyId)
  const showError = useApiErrorToast()

  const [file, setFile] = useState<File | null>(null)
  const [parsedRows, setParsedRows] = useState<BulkImportUserRow[]>([])
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [serverErrors, setServerErrors] = useState<string[]>([])
  const [result, setResult] = useState<{ created: number; updated: number } | null>(null)
  // Set only when the sheet does not already use the template's header names.
  const [mappingFor, setMappingFor] = useState<File | null>(null)
  const [sheetHeaders, setSheetHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState<ColumnMapping>({})

  async function parse(source: File, columnMapping: ColumnMapping) {
    const parsed = await parseEmployeeWorkbook(source, columnMapping)
    setParsedRows(parsed.rows)
    setParseErrors(parsed.errors)
    setMappingFor(null)
  }

  async function select(picked: File | null) {
    setFile(picked)
    setParsedRows([])
    setParseErrors([])
    setServerErrors([])
    setResult(null)
    setMappingFor(null)
    if (!picked) return

    const headers = await getWorkbookHeaders(picked)
    if (headers.length === 0) {
      setParseErrors([t('users.importPage.noHeader')])
      return
    }
    const auto = buildAutoMapping(headers)
    if (getUnmappedRequiredFields(auto).length === 0) {
      await parse(picked, auto)
      return
    }
    setSheetHeaders(headers)
    setMapping(auto)
    setMappingFor(picked)
  }

  // Arrives already picked: the Users page's "Import employees" opens the chooser itself.
  useEffect(() => {
    const preselected = (location.state as { file?: File } | null)?.file
    if (preselected) {
      void select(preselected)
      navigate(location.pathname, { replace: true, state: null })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function runImport() {
    setServerErrors([])
    try {
      const imported = await bulkImport.mutateAsync(parsedRows)
      setResult({ created: imported.createdCount, updated: imported.updatedCount })
      toast.success(t('users.importPage.imported', { created: imported.createdCount, updated: imported.updatedCount }))
      setParsedRows([])
      setFile(null)
    } catch (error) {
      const details = error instanceof ApiError ? (error.data as { details?: string[] } | undefined)?.details : undefined
      if (details?.length) setServerErrors(details)
      else showError(error)
    }
  }

  const unmapped = getUnmappedRequiredFields(mapping)
  const headerOptions = useMemo(() => sheetHeaders.map((header) => ({ value: header })), [sheetHeaders])

  const previewColumns = useMemo<ColumnDef<BulkImportUserRow, unknown>[]>(
    () => [
      { accessorKey: 'name', header: t('users.column.name') },
      { accessorKey: 'email', header: t('users.column.email') },
      { accessorKey: 'mobile', header: t('users.column.mobile') },
      { accessorKey: 'designation', header: t('users.column.designation') },
      { accessorKey: 'employeeCode', header: t('users.column.employeeCode') },
      { accessorFn: (row) => row.reportsToEmail ?? '', id: 'reportsToEmail', header: t('users.addPage.reportsToEmail') },
      {
        accessorFn: (row) => (isCompanyWidePlacement(row.orgUnitPath) ? t('users.wholeCompany.badge') : row.orgUnitPath.join(' → ')),
        id: 'orgPath',
        header: t('users.importPage.orgPath'),
      },
    ],
    [t],
  )

  return (
    <div className="space-y-4">
      <MasterPageHeader
        lead={<IconButton icon={ArrowLeft} label={t('users.back')} onClick={() => navigate(`${basePath}/users`)} />}
        title={t('users.importPage.title')}
        description={t('users.importPage.subtitle')}
        extra={
          <Button size="sm" variant="outline" className="h-9" onClick={() => void downloadEmployeeTemplate()}>
            <Download />
            {t('users.downloadTemplate')}
          </Button>
        }
      />

      <SectionCard
        title={t('users.importPage.upload')}
        description={parsedRows.length ? t('users.importPage.review') : t('users.importPage.intro')}
      >
        <div className="space-y-4">
          <FileDropzone file={file} onChange={(picked) => void select(picked)} accept={XLSX_ACCEPT} prompt={t('users.importPage.drop')} />

          {mappingFor && (
            <div className="space-y-3 rounded-md border bg-muted/40 p-4">
              <div>
                <p className="text-sm font-medium">{t('users.importPage.mapTitle', { file: mappingFor.name })}</p>
                <p className="text-xs text-muted-foreground">{t('users.importPage.mapHelp')}</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {EMPLOYEE_FIELDS.map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <Label htmlFor={`map-${field.key}`}>
                      {field.label}
                      {field.required && <span className="text-destructive"> *</span>}
                    </Label>
                    <Combobox
                      id={`map-${field.key}`}
                      options={headerOptions}
                      displayValue={(option) => option.value}
                      getOptionKey={(option) => option.value}
                      value={headerOptions.find((option) => option.value === mapping[field.key]) ?? null}
                      placeholder={field.required ? t('users.importPage.pickColumn') : t('users.importPage.notInSheet')}
                      onChange={(next) =>
                        setMapping((prev) => ({ ...prev, [field.key]: (next as { value: string } | null)?.value }))
                      }
                    />
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button disabled={unmapped.length > 0} onClick={() => void parse(mappingFor, mapping)}>
                  {t('users.importPage.useMapping')}
                </Button>
                {unmapped.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {t('users.importPage.stillNeed', { fields: unmapped.map((field) => field.label).join(', ') })}
                  </span>
                )}
              </div>
            </div>
          )}

          {parseErrors.length > 0 && (
            <ErrorList title={t('users.importPage.rowProblems', { count: parseErrors.length })} errors={parseErrors} />
          )}
          {serverErrors.length > 0 && <ErrorList title={t('users.importPage.serverErrors')} errors={serverErrors} />}

          {result && (
            <div role="status" className="flex flex-wrap items-center gap-3 rounded-md border border-success/30 bg-success/5 p-3 text-sm">
              {t('users.importPage.imported', { created: result.created, updated: result.updated })}
              <Button size="sm" variant="ghost" onClick={() => navigate(`${basePath}/users`)}>
                {t('users.addPage.view')}
                <ArrowRight />
              </Button>
            </div>
          )}

          {parsedRows.length > 0 && (
            <div className="frame-free space-y-3">
              <DataTable<BulkImportUserRow>
                columns={previewColumns}
                data={parsedRows}
                showRowSelectionColumn={false}
                pageSize={25}
                tableId="users-import-preview"
              />
              <Button onClick={() => void runImport()} disabled={bulkImport.isPending}>
                {bulkImport.isPending && <Loader2 className="animate-spin" />}
                {t('users.importPage.importCount', { count: parsedRows.length })}
              </Button>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  )
}
