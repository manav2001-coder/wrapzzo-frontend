import { ConfirmDialog } from 'primereact/confirmdialog'
import { useThemeSync } from '@/hooks/useThemeSync'
import { AppRoutes } from '@/routes/AppRoutes'
import { GlobalToast } from '@/lib/toast'

function App() {
  useThemeSync()

  return (
    <>
      <GlobalToast />
      <ConfirmDialog />
      <AppRoutes />
    </>
  )
}

export default App
