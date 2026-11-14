import { Navigate, Route, Routes } from 'react-router-dom'
import { FirstMenuRedirect } from '@/components/FirstMenuRedirect'
import { AppLayout } from '@/components/layout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { VendorProtectedRoute } from '@/components/VendorProtectedRoute'
import { ProtectedRoute as Guard } from '@/components/access-control/protected-route'
import { P } from '@/lib/permissions'
import BulkUserTemplateAssignPage from '@/pages/tbac/BulkUserTemplateAssign'
import FeatureMasterPage from '@/pages/tbac/FeatureMaster'
import FeaturesToTemplatePage from '@/pages/tbac/FeaturesToTemplate'
import FeaturesToTemplateAssignPage from '@/pages/tbac/FeaturesToTemplateAssign'
import RoleTemplateAssignPage from '@/pages/tbac/RoleTemplateAssign'
import RoleTemplatesPage from '@/pages/tbac/RoleTemplates'
import TemplateMasterPage from '@/pages/tbac/TemplateMaster'
import TemplateMasterFormPage from '@/pages/tbac/TemplateMasterForm'
import TemplatesToTemplatePage from '@/pages/tbac/TemplatesToTemplate'
import TemplatesToTemplateAssignPage from '@/pages/tbac/TemplatesToTemplateAssign'
import UserTemplateAssignPage from '@/pages/tbac/UserTemplateAssign'
import UserTemplatesPage from '@/pages/tbac/UserTemplates'
import { RolesPage } from '@/modules/admin/roles/RolesPage'
import { CompanyListPage } from '@/modules/admin/companies/CompanyListPage'
import { CompanyUsersAddPage } from '@/modules/admin/companies/CompanyUsersAddPage'
import { CompanyUsersImportPage } from '@/modules/admin/companies/CompanyUsersImportPage'
import { CompanyUsersPage } from '@/modules/admin/companies/CompanyUsersPage'
import { GiftFormPage } from '@/modules/admin/gifts/GiftFormPage'
import { GiftListPage } from '@/modules/admin/gifts/GiftListPage'
import { OrdersPage } from '@/modules/admin/orders/OrdersPage'
import { JobsMonitorPage } from '@/modules/platform-config/JobsMonitorPage'
import { PlatformDashboardPage } from '@/modules/admin/dashboard/PlatformDashboardPage'
import { VendorListPage } from '@/modules/admin/vendors/VendorListPage'
import { ApprovalQueuePage } from '@/modules/company/ApprovalQueuePage'
import { ArtworkApprovalSettingsPage } from '@/modules/artwork-approval/ArtworkApprovalSettingsPage'
import { OrderApprovalSettingsPage } from '@/modules/order-approval/OrderApprovalSettingsPage'
import { OrdersPage as CompanyOrdersPage } from '@/modules/company/OrdersPage'
import { VendorsPage as CompanyVendorsPage } from '@/modules/company/VendorsPage'
import { MenuConfigPage } from '@/modules/platform-config/MenuConfigPage'
import { DashboardPage } from '@/modules/dashboard/DashboardPage'
import { GiftStorePage } from '@/modules/quickgift/GiftStorePage'
import { QuickGiftFormPage } from '@/modules/quickgift/QuickGiftFormPage'
import { QuickGiftLandingPage } from '@/modules/quickgift/QuickGiftLandingPage'
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
          <Route path="/components" element={<ComponentsPage />} />

          {/*
            Every screen names the permission it needs (its VIEW action; create/import screens their
            create action) -- the same key its sidebar entry filters on. A missing key renders the
            Access Denied panel in place, keeping the URL. The API enforces the same keys.
          */}
          {/* Admin module -- add a new module by adding its route tree here and its entry in components/sidebar-nav-config.tsx */}
          <Route path="/home" element={<FirstMenuRedirect />} />
          <Route path="/platform-config/menu" element={<Guard permission={P.PLATFORM_MENU_CONFIG_VIEW}><MenuConfigPage /></Guard>} />
          <Route path="/platform-config/jobs" element={<Guard permission={P.PLATFORM_JOBS_VIEW}><JobsMonitorPage /></Guard>} />
          <Route path="/admin" element={<FirstMenuRedirect />} />
          <Route path="/admin/dashboard" element={<Guard permission={P.PLATFORM_DASHBOARD_VIEW}><PlatformDashboardPage /></Guard>} />
          <Route path="/admin/companies" element={<Guard permission={P.PLATFORM_COMPANY_VIEW}><CompanyListPage /></Guard>} />

          <Route path="/admin/vendors" element={<Guard permission={P.PLATFORM_VENDOR_VIEW}><VendorListPage /></Guard>} />

          <Route path="/admin/gifts" element={<Guard permission={P.PLATFORM_GIFT_VIEW}><GiftListPage /></Guard>} />
          <Route path="/admin/gifts/new" element={<Guard permission={P.PLATFORM_GIFT_CREATE}><GiftFormPage /></Guard>} />
          <Route path="/admin/gifts/:id" element={<Guard permission={P.PLATFORM_GIFT_VIEW}><GiftFormPage /></Guard>} />

          <Route path="/admin/orders" element={<Guard permission={P.PLATFORM_ORDER_VIEW}><OrdersPage /></Guard>} />

          {/* Access Control (TBAC), MobixFL's screens: the masters, then the four assignments. */}
          <Route path="/tbac/feature-master" element={<Guard permission={P.FEATURE_MASTER_VIEW}><FeatureMasterPage /></Guard>} />
          <Route path="/tbac/template-master" element={<Guard permission={P.TEMPLATE_MASTER_VIEW}><TemplateMasterPage /></Guard>} />
          <Route path="/tbac/template-master/create" element={<Guard permission={P.TEMPLATE_MASTER_ADD}><TemplateMasterFormPage mode="create" /></Guard>} />
          <Route path="/tbac/template-master/edit/:id" element={<Guard permission={P.TEMPLATE_MASTER_EDIT}><TemplateMasterFormPage mode="edit" /></Guard>} />
          <Route path="/tbac/template-master/view/:id" element={<Guard permission={P.TEMPLATE_MASTER_VIEW}><TemplateMasterFormPage mode="view" /></Guard>} />
          <Route path="/tbac/features-to-template" element={<Guard permission={P.FEATURES_TO_TEMPLATE_VIEW}><FeaturesToTemplatePage /></Guard>} />
          <Route path="/tbac/features-to-template/:templateId" element={<Guard permission={P.FEATURES_TO_TEMPLATE_VIEW}><FeaturesToTemplateAssignPage /></Guard>} />
          <Route path="/tbac/templates-to-template" element={<Guard permission={P.TEMPLATES_TO_TEMPLATE_VIEW}><TemplatesToTemplatePage /></Guard>} />
          <Route path="/tbac/templates-to-template/:templateId" element={<Guard permission={P.TEMPLATES_TO_TEMPLATE_VIEW}><TemplatesToTemplateAssignPage /></Guard>} />
          <Route path="/tbac/assignments/users/bulk-assign" element={<Guard permission={P.USER_TEMPLATE_BULK_ASSIGN}><BulkUserTemplateAssignPage /></Guard>} />
          <Route path="/tbac/assignments/users" element={<Guard permission={P.USER_TEMPLATE_VIEW}><UserTemplatesPage /></Guard>} />
          <Route path="/tbac/assignments/users/:userId" element={<Guard permission={P.USER_TEMPLATE_VIEW}><UserTemplateAssignPage /></Guard>} />
          <Route path="/tbac/assignments/roles" element={<Guard permission={P.ROLE_TEMPLATE_VIEW}><RoleTemplatesPage /></Guard>} />
          <Route path="/tbac/assignments/roles/:roleId" element={<Guard permission={P.ROLE_TEMPLATE_VIEW}><RoleTemplateAssignPage /></Guard>} />

          {/* Company-side pages, peers of /admin rather than nested under it. */}
          <Route path="/dashboard" element={<Guard permission={P.DASHBOARD_VIEW}><DashboardPage /></Guard>} />
          <Route path="/quick-gift" element={<Guard permission={P.QUICK_GIFT_CREATE}><QuickGiftLandingPage /></Guard>} />
          <Route path="/quick-gift/new/:giftId" element={<Guard permission={P.QUICK_GIFT_CREATE}><QuickGiftFormPage /></Guard>} />
          <Route path="/gift-store" element={<Guard permission={P.GIFT_STORE_VIEW}><GiftStorePage /></Guard>} />
          <Route path="/recipients" element={<Guard permission={P.DOCTOR_VIEW}><RecipientsPage /></Guard>} />
          {/* Campaigns were retired; old links and bookmarks land on the dashboard. */}
          <Route path="/campaigns/*" element={<Navigate to="/dashboard" replace />} />
          <Route path="/my-campaigns" element={<Navigate to="/dashboard" replace />} />
          {/* My Doctors was folded into Doctors; keep old links working. */}
          <Route path="/my-doctors" element={<Navigate to="/recipients" replace />} />
          <Route path="/approvals" element={<Guard permission={P.APPROVAL_VIEW}><ApprovalQueuePage /></Guard>} />
          <Route path="/orders" element={<Guard permission={P.ORDER_VIEW}><CompanyOrdersPage /></Guard>} />
          <Route path="/company/vendors" element={<Guard permission={P.COMPANY_VENDOR_VIEW}><CompanyVendorsPage /></Guard>} />

          {/* Company Admin's own roster -- same Users pages as the platform-admin route above, just resolving "my company" instead of an :id param. */}
          {/* Masters: roles and users, shared by platform staff (who pick a company) and company admins. */}
          <Route path="/masters/artwork-approval" element={<Guard permission={P.ARTWORK_APPROVAL_VIEW}><ArtworkApprovalSettingsPage /></Guard>} />
          <Route path="/masters/order-approval" element={<Guard permission={P.ORDER_APPROVAL_VIEW}><OrderApprovalSettingsPage /></Guard>} />
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
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
