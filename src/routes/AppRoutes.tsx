import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { VendorProtectedRoute } from '@/components/VendorProtectedRoute'
import { AccessControlPage } from '@/modules/admin/access-control/AccessControlPage'
import { CompanyFormPage } from '@/modules/admin/companies/CompanyFormPage'
import { CompanyListPage } from '@/modules/admin/companies/CompanyListPage'
import { CompanyUsersAddPage } from '@/modules/admin/companies/CompanyUsersAddPage'
import { CompanyUsersImportPage } from '@/modules/admin/companies/CompanyUsersImportPage'
import { CompanyUsersPage } from '@/modules/admin/companies/CompanyUsersPage'
import { GiftFormPage } from '@/modules/admin/gifts/GiftFormPage'
import { GiftListPage } from '@/modules/admin/gifts/GiftListPage'
import { OrdersPage } from '@/modules/admin/orders/OrdersPage'
import { VendorListPage } from '@/modules/admin/vendors/VendorListPage'
import { ApprovalQueuePage } from '@/modules/campaigns/ApprovalQueuePage'
import { CampaignDetailPage } from '@/modules/campaigns/CampaignDetailPage'
import { CampaignListPage } from '@/modules/campaigns/CampaignListPage'
import { CampaignWizardPage } from '@/modules/campaigns/CampaignWizardPage'
import { MyCampaignsPage } from '@/modules/campaigns/MyCampaignsPage'
import { OrdersPage as CampaignOrdersPage } from '@/modules/campaigns/OrdersPage'
import { SubmissionFormPage } from '@/modules/campaigns/SubmissionFormPage'
import { VendorsPage as CompanyVendorsPage } from '@/modules/campaigns/VendorsPage'
import { MenuNamesPage } from '@/modules/company/MenuNamesPage'
import { WarehousesPage } from '@/modules/campaigns/WarehousesPage'
import { DashboardPage } from '@/modules/dashboard/DashboardPage'
import { GiftStorePage } from '@/modules/quickgift/GiftStorePage'
import { QuickGiftFormPage } from '@/modules/quickgift/QuickGiftFormPage'
import { QuickGiftLandingPage } from '@/modules/quickgift/QuickGiftLandingPage'
import { MyDoctorsPage } from '@/modules/recipients/MyDoctorsPage'
import { RecipientsPage } from '@/modules/recipients/RecipientsPage'
import { VendorGiftFormPage } from '@/modules/vendor/gifts/VendorGiftFormPage'
import { VendorGiftListPage } from '@/modules/vendor/gifts/VendorGiftListPage'
import { VendorHomePage } from '@/modules/vendor/home/VendorHomePage'
import { VendorOrderPage } from '@/modules/vendor/orders/VendorOrderPage'
import { VendorOrdersPage } from '@/modules/vendor/orders/VendorOrdersPage'
import { LandingPage } from '@/pages/LandingPage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { RecipientUploadPage } from '@/pages/RecipientUploadPage'
import ComponentsPage from '@/pages/Components'
import SettingsPage from '@/pages/Settings'
import { SetupPasswordPage } from '@/pages/SetupPasswordPage'
import { SetupVendorPasswordPage } from '@/pages/SetupVendorPasswordPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/setup-password" element={<SetupPasswordPage />} />
      <Route path="/vendor/setup-password" element={<SetupVendorPasswordPage />} />
      <Route path="/recipient-upload/:token" element={<RecipientUploadPage />} />
      <Route path="/quick-gift-upload/:token" element={<RecipientUploadPage kind="quick-gift" />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          {/* Shared by every signed-in user. */}
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/components" element={<ComponentsPage />} />

          {/* Admin module -- add a new module by adding its route tree here and its entry in components/sidebar-nav-config.tsx */}
          <Route path="/admin" element={<Navigate to="/admin/companies" replace />} />
          <Route path="/admin/companies" element={<CompanyListPage />} />
          <Route path="/admin/companies/new" element={<CompanyFormPage />} />
          <Route path="/admin/companies/:id" element={<CompanyFormPage />} />
          <Route path="/admin/companies/:id/users" element={<CompanyUsersPage />} />
          <Route path="/admin/companies/:id/add-users" element={<CompanyUsersAddPage />} />
          <Route path="/admin/companies/:id/import-users" element={<CompanyUsersImportPage />} />

          <Route path="/admin/vendors" element={<VendorListPage />} />
          <Route path="/admin/vendors/:id" element={<VendorListPage />} />

          <Route path="/admin/gifts" element={<GiftListPage />} />
          <Route path="/admin/gifts/new" element={<GiftFormPage />} />
          <Route path="/admin/gifts/:id" element={<GiftFormPage />} />

          <Route path="/admin/orders" element={<OrdersPage />} />

          <Route path="/admin/access-control" element={<AccessControlPage />} />

          {/* Campaigns module -- company-side, PRD Part 2.5. Peer of /admin, not nested under it. */}
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/quick-gift" element={<QuickGiftLandingPage />} />
          <Route path="/quick-gift/new/:giftId" element={<QuickGiftFormPage />} />
          <Route path="/gift-store" element={<GiftStorePage />} />
          <Route path="/campaigns" element={<CampaignListPage />} />
          <Route path="/campaigns/new" element={<CampaignWizardPage />} />
          <Route path="/campaigns/:id" element={<CampaignDetailPage />} />
          <Route path="/campaigns/:id/submit" element={<SubmissionFormPage />} />
          <Route path="/my-campaigns" element={<MyCampaignsPage />} />
          <Route path="/recipients" element={<RecipientsPage />} />
          <Route path="/my-doctors" element={<MyDoctorsPage />} />
          <Route path="/approvals" element={<ApprovalQueuePage />} />
          <Route path="/orders" element={<CampaignOrdersPage />} />
          <Route path="/company/vendors" element={<CompanyVendorsPage />} />
          <Route path="/warehouses" element={<WarehousesPage />} />
          <Route path="/company/menu-names" element={<MenuNamesPage />} />

          {/* Company Admin's own roster -- same Users pages as the platform-admin route above, just resolving "my company" instead of an :id param. */}
          <Route path="/company/users" element={<CompanyUsersPage />} />
          <Route path="/company/add-users" element={<CompanyUsersAddPage />} />
          <Route path="/company/import-users" element={<CompanyUsersImportPage />} />
        </Route>
      </Route>

      <Route element={<VendorProtectedRoute />}>
        <Route element={<AppLayout portal="vendor" />}>
          <Route path="/vendor" element={<VendorHomePage />} />
          <Route path="/vendor/gifts" element={<VendorGiftListPage />} />
          <Route path="/vendor/gifts/new" element={<VendorGiftFormPage />} />
          <Route path="/vendor/gifts/:id" element={<VendorGiftFormPage />} />
          <Route path="/vendor/orders" element={<VendorOrdersPage />} />
          <Route path="/vendor/orders/:id" element={<VendorOrderPage />} />
          <Route path="/vendor/settings" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
