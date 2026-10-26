import { ConfirmDialog } from 'primereact/confirmdialog'
import { AppRoutes } from '@/routes/AppRoutes'

function App() {
  return (
    <>
      {/* MIGRATION: only for pages still calling PrimeReact's confirmDialog(); goes with the last of them. */}
      <ConfirmDialog style={{ width: '28rem' }} breakpoints={{ '960px': '90vw', '640px': '95vw' }} />
      <AppRoutes />
    </>
  )
}

export default App
