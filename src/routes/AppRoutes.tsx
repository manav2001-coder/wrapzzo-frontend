import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { CompanyFormPage } from '@/modules/admin/companies/CompanyFormPage'
import { CompanyListPage } from '@/modules/admin/companies/CompanyListPage'
import { GiftFormPage } from '@/modules/admin/gifts/GiftFormPage'
import { GiftListPage } from '@/modules/admin/gifts/GiftListPage'
import { OrdersPage } from '@/modules/admin/orders/OrdersPage'
import { VendorFormPage } from '@/modules/admin/vendors/VendorFormPage'
import { VendorListPage } from '@/modules/admin/vendors/VendorListPage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/admin/companies" replace />} />

          {/* Admin module -- add a new module by adding its route tree here and its entry in config/navigation.ts */}
          <Route path="/admin" element={<Navigate to="/admin/companies" replace />} />
          <Route path="/admin/companies" element={<CompanyListPage />} />
          <Route path="/admin/companies/new" element={<CompanyFormPage />} />
          <Route path="/admin/companies/:id" element={<CompanyFormPage />} />

          <Route path="/admin/vendors" element={<VendorListPage />} />
          <Route path="/admin/vendors/new" element={<VendorFormPage />} />
          <Route path="/admin/vendors/:id" element={<VendorFormPage />} />

          <Route path="/admin/gifts" element={<GiftListPage />} />
          <Route path="/admin/gifts/new" element={<GiftFormPage />} />
          <Route path="/admin/gifts/:id" element={<GiftFormPage />} />

          <Route path="/admin/orders" element={<OrdersPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
