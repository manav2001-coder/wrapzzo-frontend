import { useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { type TokenResponse } from './api/auth'
import { AppShell } from './layouts/AppShell'
import { AccessControlPage } from './pages/AccessControlPage'
import { CompanyCreatePage } from './pages/companies/CompanyCreatePage'
import { CompanyEditPage } from './pages/companies/CompanyEditPage'
import { CompanyListPage } from './pages/companies/CompanyListPage'
import { GiftCreatePage } from './pages/gifts/GiftCreatePage'
import { GiftEditPage } from './pages/gifts/GiftEditPage'
import { GiftListPage } from './pages/gifts/GiftListPage'
import { LoginPage } from './pages/LoginPage'
import { VendorCreatePage } from './pages/vendors/VendorCreatePage'
import { VendorEditPage } from './pages/vendors/VendorEditPage'
import { VendorListPage } from './pages/vendors/VendorListPage'

/**
 * Throwaway test harness for the API -- not the real app UI. A proper
 * frontend build replaces this. Exists only to prove the backend works
 * end-to-end.
 */
function App() {
  const [tokens, setTokens] = useState<TokenResponse | null>(null)
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <LoginPage
            onLogin={(newTokens, newEmail) => {
              setTokens(newTokens)
              setEmail(newEmail)
            }}
          />
        }
      />
      <Route
        path="/"
        element={
          <AppShell
            tokens={tokens}
            email={email}
            error={error}
            onError={setError}
            onLogout={() => setTokens(null)}
          />
        }
      >
        <Route index element={<Navigate to="/companies" replace />} />

        <Route path="companies" element={<CompanyListPage />} />
        <Route path="companies/new" element={<CompanyCreatePage />} />
        <Route path="companies/:id" element={<CompanyEditPage />} />

        <Route path="gifts" element={<GiftListPage />} />
        <Route path="gifts/new" element={<GiftCreatePage />} />
        <Route path="gifts/:id" element={<GiftEditPage />} />

        <Route path="vendors" element={<VendorListPage />} />
        <Route path="vendors/new" element={<VendorCreatePage />} />
        <Route path="vendors/:id" element={<VendorEditPage />} />

        <Route path="access-control" element={<AccessControlPage />} />
      </Route>
    </Routes>
  )
}

export default App
