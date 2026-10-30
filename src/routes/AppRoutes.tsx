import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { VendorProtectedRoute } from '@/components/VendorProtectedRoute'
import { ProtectedRoute as Guard } from '@/components/access-control/protected-route'
import { P } from '@/lib/permissions'
import { FeatureMasterPage } from '@/modules/admin/access-control/FeatureMasterPage'
import { FeaturesToTemplatePage } from '@/modules/admin/access-control/FeaturesToTemplatePage'
import { RoleToTemplatePage } from '@/modules/admin/access-control/RoleToTemplatePage'
import { TemplatesPage } from '@/modules/admin/access-control/TemplatesPage'
import { TemplatesToTemplatePage } from '@/modules/admin/access-control/TemplatesToTemplatePage'
import { UserToTemplatePage } from '@/modules/admin/access-control/UserToTemplatePage'
import { RolesPage } from '@/modules/admin/roles/RolesPage'
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

          {/*
            Every screen names the permission it needs (its VIEW action; create/import screens their
            create action) -- the same key its sidebar entry filters on. A missing key renders the
            Access Denied panel in place, keeping the URL. The API enforces the same keys.
          */}
          {/* Admin module -- add a new module by adding its route tree here and its entry in components/sidebar-nav-config.tsx */}
          <Route path="/admin" element={<Navigate to="/admin/companies" replace />} />
          <Route path="/admin/companies" element={<Guard permission={P.PLATFORM_COMPANY_VIEW}><CompanyListPage /></Guard>} />
          <Route path="/admin/companies/new" element={<Guard permission={P.PLATFORM_COMPANY_CREATE}><CompanyFormPage /></Guard>} />
          <Route path="/admin/companies/:id" element={<Guard permission={P.PLATFORM_COMPANY_VIEW}><CompanyFormPage /></Guard>} />

          <Route path="/admin/vendors" element={<Guard permission={P.PLATFORM_VENDOR_VIEW}><VendorListPage /></Guard>} />
          <Route path="/admin/vendors/:id" element={<Guard permission={P.PLATFORM_VENDOR_VIEW}><VendorListPage /></Guard>} />

          <Route path="/admin/gifts" element={<Guard permission={P.PLATFORM_PRODUCT_VIEW}><GiftListPage /></Guard>} />
          <Route path="/admin/gifts/new" element={<Guard permission={P.PLATFORM_PRODUCT_CREATE}><GiftFormPage /></Guard>} />
          <Route path="/admin/gifts/:id" element={<Guard permission={P.PLATFORM_PRODUCT_VIEW}><GiftFormPage /></Guard>} />

          <Route path="/admin/orders" element={<Guard permission={P.PLATFORM_ORDER_VIEW}><OrdersPage /></Guard>} />

          {/* Access control (TBAC): shared by platform staff and company admins, who each work on their own scope. */}
          <Route path="/access/features" element={<Guard permission={P.TEMPLATE_VIEW}><FeatureMasterPage /></Guard>} />
          <Route path="/access/templates" element={<Guard permission={P.TEMPLATE_VIEW}><TemplatesPage /></Guard>} />
          <Route path="/access/features-to-template" element={<Guard permission={P.TEMPLATE_VIEW}><FeaturesToTemplatePage /></Guard>} />
          <Route path="/access/templates-to-template" element={<Guard permission={P.TEMPLATE_VIEW}><TemplatesToTemplatePage /></Guard>} />
          <Route path="/access/role-templates" element={<Guard permission={P.ROLE_VIEW}><RoleToTemplatePage /></Guard>} />
          <Route path="/access/user-templates" element={<Guard permission={P.ACCESS_VIEW}><UserToTemplatePage /></Guard>} />

          {/* Campaigns module -- company-side, PRD Part 2.5. Peer of /admin, not nested under it. */}
          <Route path="/dashboard" element={<Guard permission={P.DASHBOARD_VIEW}><DashboardPage /></Guard>} />
          <Route path="/quick-gift" element={<Guard permission={P.REQUEST_CREATE}><QuickGiftLandingPage /></Guard>} />
          <Route path="/quick-gift/new/:giftId" element={<Guard permission={P.REQUEST_CREATE}><QuickGiftFormPage /></Guard>} />
          <Route path="/gift-store" element={<Guard permission={P.PRODUCT_VIEW}><GiftStorePage /></Guard>} />
          <Route path="/campaigns" element={<Guard permission={P.CAMPAIGN_VIEW}><CampaignListPage /></Guard>} />
          <Route path="/campaigns/new" element={<Guard permission={P.CAMPAIGN_CREATE}><CampaignWizardPage /></Guard>} />
          <Route path="/campaigns/:id" element={<Guard permissions={[P.CAMPAIGN_VIEW, P.CAMPAIGN_ENTRY_SUBMIT]}><CampaignDetailPage /></Guard>} />
          <Route path="/campaigns/:id/submit" element={<Guard permission={P.CAMPAIGN_ENTRY_SUBMIT}><SubmissionFormPage /></Guard>} />
          <Route path="/my-campaigns" element={<Guard permission={P.CAMPAIGN_ENTRY_SUBMIT}><MyCampaignsPage /></Guard>} />
          <Route path="/recipients" element={<Guard permission={P.RECIPIENT_VIEW}><RecipientsPage /></Guard>} />
          <Route path="/my-doctors" element={<Guard permissions={[P.RECIPIENT_LIST_MANAGE, P.REQUEST_CREATE]}><MyDoctorsPage /></Guard>} />
          <Route path="/approvals" element={<Guard permissions={[P.REQUEST_APPROVE, P.RECIPIENT_LIST_APPROVE, P.ORDER_ARTWORK_FINAL]} forManagers><ApprovalQueuePage /></Guard>} />
          <Route path="/orders" element={<Guard permission={P.ORDER_VIEW}><CampaignOrdersPage /></Guard>} />
          <Route path="/company/vendors" element={<Guard permission={P.COMPANY_VENDOR_VIEW}><CompanyVendorsPage /></Guard>} />
          <Route path="/warehouses" element={<Guard permission={P.WAREHOUSE_VIEW}><WarehousesPage /></Guard>} />
          <Route path="/company/menu-names" element={<Guard permission={P.MENU_EDIT}><MenuNamesPage /></Guard>} />

          {/* Company Admin's own roster -- same Users pages as the platform-admin route above, just resolving "my company" instead of an :id param. */}
          {/* Masters: roles and users, shared by platform staff (who pick a company) and company admins. */}
          <Route path="/masters/roles" element={<Guard permission={P.ROLE_VIEW}><RolesPage /></Guard>} />
          <Route path="/masters/users" element={<Guard permission={P.USER_VIEW}><CompanyUsersPage /></Guard>} />
          <Route path="/masters/users/add" element={<Guard permission={P.USER_CREATE}><CompanyUsersAddPage /></Guard>} />
          <Route path="/masters/users/import" element={<Guard permission={P.USER_CREATE}><CompanyUsersImportPage /></Guard>} />
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
