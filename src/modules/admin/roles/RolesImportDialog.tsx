import { Download } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { AppDialog } from '@/components/app-dialog'
import { FileDropzone } from '@/components/file-dropzone'
import { Button } from '@/components/ui/button'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useBulkImportRoles } from '@/hooks/useRoles'
import { ApiError } from '@/lib/axiosClient'
import { downloadRoleTemplate, parseRoleWorkbook, type ParsedRoleSheet } from '@/lib/roleTemplate'
import { ErrorList } from '../companies/ErrorList'

const XLSX_ACCEPT = { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }

/** Roles from a sheet -- Name and Description, one role per row; all of it imports or none of it does. */
export function RolesImportDialog({ companyId, open, onOpenChange }: { companyId: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation('admin')
  const showError = useApiErrorToast()
  const importRoles = useBulkImportRoles(companyId)
  const [file, setFile] = useState<File | null>(null)
  const [parsed, setParsed] = useState<ParsedRoleSheet | null>(null)
  const [serverErrors, setServerErrors] = useState<string[]>([])

  function close(next: boolean) {
    if (!next) {
      setFile(null)
      setParsed(null)
      setServerErrors([])
    }
    onOpenChange(next)
  }

  async function pick(picked: File | null) {
    setFile(picked)
    setServerErrors([])
    setParsed(picked ? await parseRoleWorkbook(picked).catch(() => ({ rows: [], errors: [t('roles.import.unreadable')] })) : null)
  }

  async function submit() {
    if (!parsed?.rows.length) return
    try {
      const result = await importRoles.mutateAsync(parsed.rows)
      toast.success(t('roles.import.done', { created: result.createdCount, updated: result.updatedCount }))
      close(false)
    } catch (error) {
      const details = error instanceof ApiError ? (error.data as { details?: string[] } | undefined)?.details : undefined
      if (details?.length) setServerErrors(details)
      else showError(error)
    }
  }

  const rows = parsed?.rows ?? []
  return (
    <AppDialog
      open={open}
      onOpenChange={close}
      title={t('roles.import.title')}
      description={t('roles.import.help')}
      confirmLabel={t('roles.import.confirm', { count: rows.length })}
      cancelLabel={t('action.cancel', { ns: 'common' })}
      confirmDisabled={rows.length === 0 || (parsed?.errors.length ?? 0) > 0}
      loading={importRoles.isPending}
      onConfirm={submit}
    >
      <div className="space-y-4">
        <Button variant="outline" size="sm" onClick={() => void downloadRoleTemplate()}>
          <Download className="mr-1.5 h-4 w-4" />
          {t('roles.import.template')}
        </Button>
        <FileDropzone file={file} onChange={(picked) => void pick(picked)} accept={XLSX_ACCEPT} prompt={t('roles.import.drop')} />
        {parsed && parsed.errors.length > 0 && <ErrorList title={t('roles.import.sheetErrors')} errors={parsed.errors} />}
        {rows.length > 0 && parsed?.errors.length === 0 && <p className="text-sm text-muted-foreground">{t('roles.import.ready', { count: rows.length })}</p>}
        {serverErrors.length > 0 && <ErrorList title={t('roles.import.serverErrors')} errors={serverErrors} />}
      </div>
    </AppDialog>
  )
}
