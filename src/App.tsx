import { ConfirmDialog } from 'primereact/confirmdialog'
import { useThemeSync } from '@/hooks/useThemeSync'
import { AppRoutes } from '@/routes/AppRoutes'
import { GlobalToast } from '@/lib/toast'

function App() {
  useThemeSync()

  return (
    <>
      <GlobalToast />
      <ConfirmDialog style={{ width: '28rem' }} breakpoints={{ '960px': '90vw', '640px': '95vw' }} />
      <AppRoutes />
    </>
  )
}

export default App
