import { Download, Loader2 } from 'lucide-react'
import { useState } from 'react'

import { downloadDashboardExport, type DashboardRange } from '@/api/dashboard'
import { showApiError, showToast } from '@/lib/toast'

/** Saves the orders behind the dashboard for the chosen period as a spreadsheet. Icon-only on a phone, labelled from tablet width. */
export function ExportButton({ range }: { range: DashboardRange }) {
  const [busy, setBusy] = useState(false)
  async function run() {
    setBusy(true)
    try {
      await downloadDashboardExport(range)
      showToast({ severity: 'success', summary: 'Report downloaded', detail: 'Open it in Excel or Google Sheets.' })
    } catch (error) {
      showApiError(error, 'The report could not be downloaded. Please try again.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <button
      type="button"
      onClick={run}
      disabled={busy}
      aria-label="Download report"
      className="flex min-h-11 shrink-0 items-center gap-2 rounded-full border bg-background/70 px-3.5 text-sm font-medium transition-colors hover:bg-background focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none disabled:opacity-60 sm:px-4"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
      <span className="hidden sm:inline">Download report</span>
    </button>
  )
}
