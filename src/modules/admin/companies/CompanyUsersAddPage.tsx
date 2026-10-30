import { ArrowLeft, Check, Loader2, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import type { BulkImportUserRow } from '@/api/users'
import { TextField } from '@/components/fields/text-field'
import { IconButton } from '@/components/icon-button'
import { MasterPageHeader } from '@/components/masters/master-page'
import { SectionCard } from '@/components/section-card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useCompanyUserContext } from '@/hooks/useCompanyUserContext'
import { useBulkImportUsers } from '@/hooks/useUsers'
import { ApiError } from '@/lib/axiosClient'
import { ErrorList } from './ErrorList'

type Column = 'name' | 'email' | 'mobile' | 'designation' | 'role' | 'employeeCode' | 'reportsToEmail' | 'orgUnit'
type DraftRow = Record<Column, string> & { key: number }

/**
 * Quick-add goes one org level deep; a company that needs a full Division/Zone/Region hierarchy
 * is better served by the spreadsheet import, which supports four.
 */
const COLUMNS: { key: Column; labelKey: string; required: boolean; placeholder: string }[] = [
  { key: 'name', labelKey: 'users.column.name', required: true, placeholder: 'Jane Doe' },
  { key: 'email', labelKey: 'users.column.email', required: true, placeholder: 'jane@company.com' },
  { key: 'mobile', labelKey: 'users.column.mobile', required: true, placeholder: '9876543210' },
  { key: 'designation', labelKey: 'users.column.designation', required: true, placeholder: 'Sales Exec' },
  { key: 'role', labelKey: 'users.column.role', required: true, placeholder: 'Member' },
  { key: 'employeeCode', labelKey: 'users.column.employeeCode', required: true, placeholder: 'E001' },
  { key: 'reportsToEmail', labelKey: 'users.addPage.reportsToEmail', required: false, placeholder: '' },
  { key: 'orgUnit', labelKey: 'users.column.orgUnit', required: true, placeholder: 'North Zone' },
]

let nextKey = 1
const emptyRow = (): DraftRow => ({
  key: nextKey++,
  name: '',
  email: '',
  mobile: '',
  designation: '',
  role: '',
  employeeCode: '',
  reportsToEmail: '',
  orgUnit: '',
})
const isBlank = (row: DraftRow) => COLUMNS.every((col) => !row[col.key].trim())

export function CompanyUsersAddPage() {
  const { t } = useTranslation('admin')
  const { companyId, listPath, importPath } = useCompanyUserContext()
  const navigate = useNavigate()
  const bulkImport = useBulkImportUsers(companyId)
  const showError = useApiErrorToast()

  const [rows, setRows] = useState<DraftRow[]>(() => [emptyRow()])
  const [missing, setMissing] = useState<Set<string>>(new Set())
  const [serverErrors, setServerErrors] = useState<string[]>([])

  function update(key: number, column: Column, value: string) {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, [column]: value } : row)))
    setMissing((prev) => {
      const next = new Set(prev)
      next.delete(`${key}.${column}`)
      return next
    })
  }

  async function save() {
    setServerErrors([])
    const filled = rows.filter((row) => !isBlank(row))
    if (filled.length === 0) {
      toast.error(t('users.addPage.none'))
      return
    }
    const gaps = new Set<string>()
    for (const row of filled) {
      for (const col of COLUMNS) if (col.required && !row[col.key].trim()) gaps.add(`${row.key}.${col.key}`)
    }
    setMissing(gaps)
    if (gaps.size > 0) return

    const payload: BulkImportUserRow[] = filled.map((row) => ({
      name: row.name.trim(),
      email: row.email.trim(),
      mobile: row.mobile.trim(),
      designation: row.designation.trim(),
      role: row.role.trim(),
      employeeCode: row.employeeCode.trim(),
      reportsToEmail: row.reportsToEmail.trim() || undefined,
      orgUnitPath: [row.orgUnit.trim()],
    }))
    try {
      const result = await bulkImport.mutateAsync(payload)
      toast.success(t('users.addPage.saved', { created: result.createdCount, updated: result.updatedCount }))
      setRows([emptyRow()])
    } catch (error) {
      // The backend checks the whole batch first and names each bad row.
      const details = error instanceof ApiError ? (error.data as { details?: string[] } | undefined)?.details : undefined
      if (details?.length) setServerErrors(details)
      else showError(error)
    }
  }

  return (
    <div className="space-y-4">
      <MasterPageHeader
        lead={<IconButton icon={ArrowLeft} label={t('users.back')} onClick={() => navigate(listPath)} />}
        title={t('users.addPage.title')}
        description={t('users.addPage.subtitle')}
        extra={
          <Button size="sm" variant="outline" className="h-9" onClick={() => navigate(importPath)}>
            {t('users.addPage.toImport')}
          </Button>
        }
      />
      <SectionCard description={t('users.addPage.help')}>
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-md border">
            <Table className="min-w-[1050px]">
              <TableHeader>
                <TableRow>
                  {COLUMNS.map((col) => (
                    <TableHead key={col.key} className="text-left">
                      {t(col.labelKey)}
                      {col.required && <span className="text-destructive"> *</span>}
                    </TableHead>
                  ))}
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, index) => (
                  <TableRow key={row.key}>
                    {COLUMNS.map((col) => (
                      <TableCell key={col.key} className="p-1.5">
                        <TextField
                          size="sm"
                          aria-label={`${t(col.labelKey)} ${index + 1}`}
                          value={row[col.key]}
                          placeholder={col.placeholder}
                          error={missing.has(`${row.key}.${col.key}`)}
                          aria-invalid={missing.has(`${row.key}.${col.key}`)}
                          onChange={(event) => update(row.key, col.key, event.target.value)}
                        />
                      </TableCell>
                    ))}
                    <TableCell className="p-1.5 text-center">
                      <IconButton
                        icon={Trash2}
                        size="sm"
                        tone="destructive"
                        label={t('a11y.removeRow', { ns: 'common' })}
                        disabled={rows.length === 1}
                        onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Button variant="outline" size="sm" onClick={() => setRows((prev) => [...prev, emptyRow()])}>
            <Plus />
            {t('users.addPage.addRow')}
          </Button>

          {serverErrors.length > 0 && <ErrorList title={t('users.addPage.serverErrors')} errors={serverErrors} />}

          <div className="flex items-center gap-2">
            <Button onClick={() => void save()} disabled={bulkImport.isPending}>
              {bulkImport.isPending ? <Loader2 className="animate-spin" /> : <Check />}
              {t('users.addPage.save')}
            </Button>
            <Button variant="ghost" onClick={() => navigate(listPath)}>
              {t('users.addPage.view')}
            </Button>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
