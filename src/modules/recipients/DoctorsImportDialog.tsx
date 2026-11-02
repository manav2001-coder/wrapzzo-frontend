import { Download } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { AppDialog } from '@/components/app-dialog'
import { FileDropzone } from '@/components/file-dropzone'
import { Button } from '@/components/ui/button'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useBulkCreateMyDoctors } from '@/hooks/useRecipients'
import { downloadDoctorTemplate, parseDoctorWorkbook, type ParsedDoctorSheet } from '@/lib/doctorTemplate'
import { ErrorList } from '@/modules/admin/companies/ErrorList'

const XLSX_ACCEPT = { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }

/** Doctors from a sheet straight onto the caller's own list -- no approval; all of it imports or none of it does. */
export function DoctorsImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation('recipients')
  const showError = useApiErrorToast()
  const importDoctors = useBulkCreateMyDoctors()
  const [file, setFile] = useState<File | null>(null)
  const [parsed, setParsed] = useState<ParsedDoctorSheet | null>(null)

  function close(next: boolean) {
    if (!next) {
      setFile(null)
      setParsed(null)
    }
    onOpenChange(next)
  }

  async function pick(picked: File | null) {
    setFile(picked)
    setParsed(picked ? await parseDoctorWorkbook(picked).catch(() => ({ rows: [], errors: [t('import.unreadable')] })) : null)
  }

  async function submit() {
    if (!parsed?.rows.length) return
    try {
      const result = await importDoctors.mutateAsync(parsed.rows)
      toast.success(t('import.done', { created: result.created, joined: result.joined, unchanged: result.unchanged }))
      close(false)
    } catch (error) {
      showError(error)
    }
  }

  const rows = parsed?.rows ?? []
  return (
    <AppDialog
      open={open}
      onOpenChange={close}
      title={t('import.title')}
      description={t('import.help')}
      confirmLabel={t('import.confirm', { count: rows.length })}
      cancelLabel={t('action.cancel', { ns: 'common' })}
      confirmDisabled={rows.length === 0 || (parsed?.errors.length ?? 0) > 0}
      loading={importDoctors.isPending}
      onConfirm={submit}
    >
      <div className="space-y-4">
        <Button variant="outline" size="sm" onClick={() => void downloadDoctorTemplate()}>
          <Download className="mr-1.5 h-4 w-4" />
          {t('import.template')}
        </Button>
        <FileDropzone file={file} onChange={(picked) => void pick(picked)} accept={XLSX_ACCEPT} prompt={t('import.drop')} />
        {parsed && parsed.errors.length > 0 && <ErrorList title={t('import.sheetErrors')} errors={parsed.errors} />}
        {rows.length > 0 && parsed?.errors.length === 0 && <p className="text-sm text-muted-foreground">{t('import.ready', { count: rows.length })}</p>}
      </div>
    </AppDialog>
  )
}
