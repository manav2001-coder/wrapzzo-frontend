import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { FirstMenuRedirect } from '@/components/FirstMenuRedirect'
import { AppLayout } from '@/components/layout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { VendorProtectedRoute } from '@/components/VendorProtectedRoute'
import { ProtectedRoute as Guard } from '@/components/access-control/protected-route'
import { P } from '@/lib/permissions'
import { LandingPage } from '@/pages/LandingPage'
import { LoginPage } from '@/pages/LoginPage'

// Each screen is fetched when it is first opened, not shipped to everyone in one 3 MB file.
const BulkUserTemplateAssignPage = lazy(() => import('@/pages/tbac/BulkUserTemplateAssign'))
const FeatureMasterPage = lazy(() => import('@/pages/tbac/FeatureMaster'))
const FeaturesToTemplatePage = lazy(() => import('@/pages/tbac/FeaturesToTemplate'))
const FeaturesToTemplateAssignPage = lazy(() => import('@/pages/tbac/FeaturesToTemplateAssign'))
const RoleTemplateAssignPage = lazy(() => import('@/pages/tbac/RoleTemplateAssign'))
const RoleTemplatesPage = lazy(() => import('@/pages/tbac/RoleTemplates'))
const TemplateMasterPage = lazy(() => import('@/pages/tbac/TemplateMaster'))
const TemplateMasterFormPage = lazy(() => import('@/pages/tbac/TemplateMasterForm'))
const TemplatesToTemplatePage = lazy(() => import('@/pages/tbac/TemplatesToTemplate'))
const TemplatesToTemplateAssignPage = lazy(() => import('@/pages/tbac/TemplatesToTemplateAssign'))
const UserTemplateAssignPage = lazy(() => import('@/pages/tbac/UserTemplateAssign'))
const UserTemplatesPage = lazy(() => import('@/pages/tbac/UserTemplates'))
const RolesPage = lazy(() => import('@/modules/admin/roles/RolesPage').then((m) => ({ default: m.RolesPage })))
const CompanyListPage = lazy(() => import('@/modules/admin/companies/CompanyListPage').then((m) => ({ default: m.CompanyListPage })))
const CompanyUsersAddPage = lazy(() => import('@/modules/admin/companies/CompanyUsersAddPage').then((m) => ({ default: m.CompanyUsersAddPage })))
const CompanyUsersImportPage = lazy(() => import('@/modules/admin/companies/CompanyUsersImportPage').then((m) => ({ default: m.CompanyUsersImportPage })))
const CompanyUsersPage = lazy(() => import('@/modules/admin/companies/CompanyUsersPage').then((m) => ({ default: m.CompanyUsersPage })))
const GiftFormPage = lazy(() => import('@/modules/admin/gifts/GiftFormPage').then((m) => ({ default: m.GiftFormPage })))
const GiftListPage = lazy(() => import('@/modules/admin/gifts/GiftListPage').then((m) => ({ default: m.GiftListPage })))
const OrdersPage = lazy(() => import('@/modules/admin/orders/OrdersPage').then((m) => ({ default: m.OrdersPage })))
const JobsMonitorPage = lazy(() => import('@/modules/platform-config/JobsMonitorPage').then((m) => ({ default: m.JobsMonitorPage })))
const PlatformDashboardPage = lazy(() => import('@/modules/admin/dashboard/PlatformDashboardPage').then((m) => ({ default: m.PlatformDashboardPage })))
const VendorListPage = lazy(() => import('@/modules/admin/vendors/VendorListPage').then((m) => ({ default: m.VendorListPage })))
const ApprovalQueuePage = lazy(() => import('@/modules/company/ApprovalQueuePage').then((m) => ({ default: m.ApprovalQueuePage })))
const ArtworkApprovalSettingsPage = lazy(() => import('@/modules/artwork-approval/ArtworkApprovalSettingsPage').then((m) => ({ default: m.ArtworkApprovalSettingsPage })))
const OrderApprovalSettingsPage = lazy(() => import('@/modules/order-approval/OrderApprovalSettingsPage').then((m) => ({ default: m.OrderApprovalSettingsPage })))
const CompanyOrdersPage = lazy(() => import('@/modules/company/OrdersPage').then((m) => ({ default: m.OrdersPage })))
const CompanyVendorsPage = lazy(() => import('@/modules/company/VendorsPage').then((m) => ({ default: m.VendorsPage })))
const EmailSettingsPage = lazy(() => import('@/modules/platform-config/EmailSettingsPage').then((m) => ({ default: m.EmailSettingsPage })))
const MenuConfigPage = lazy(() => import('@/modules/platform-config/MenuConfigPage').then((m) => ({ default: m.MenuConfigPage })))
const DashboardPage = lazy(() => import('@/modules/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const GiftStorePage = lazy(() => import('@/modules/quickgift/GiftStorePage').then((m) => ({ default: m.GiftStorePage })))
const ProfilePage = lazy(() => import('@/modules/profile/ProfilePage').then((m) => ({ default: m.ProfilePage })))
const QuickGiftFormPage = lazy(() => import('@/modules/quickgift/QuickGiftFormPage').then((m) => ({ default: m.QuickGiftFormPage })))
const QuickGiftLandingPage = lazy(() => import('@/modules/quickgift/QuickGiftLandingPage').then((m) => ({ default: m.QuickGiftLandingPage })))
const RecipientsPage = lazy(() => import('@/modules/recipients/RecipientsPage').then((m) => ({ default: m.RecipientsPage })))
const VendorGiftFormPage = lazy(() => import('@/modules/vendor/gifts/VendorGiftFormPage').then((m) => ({ default: m.VendorGiftFormPage })))
const VendorGiftListPage = lazy(() => import('@/modules/vendor/gifts/VendorGiftListPage').then((m) => ({ default: m.VendorGiftListPage })))
const VendorHomePage = lazy(() => import('@/modules/vendor/home/VendorHomePage').then((m) => ({ default: m.VendorHomePage })))
const VendorOrderPage = lazy(() => import('@/modules/vendor/orders/VendorOrderPage').then((m) => ({ default: m.VendorOrderPage })))
const VendorOrdersPage = lazy(() => import('@/modules/vendor/orders/VendorOrdersPage').then((m) => ({ default: m.VendorOrdersPage })))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })))
const RecipientUploadPage = lazy(() => import('@/pages/RecipientUploadPage').then((m) => ({ default: m.RecipientUploadPage })))
const ComponentsPage = lazy(() => import('@/pages/Components'))
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })))
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })))
const SetupPasswordPage = lazy(() => import('@/pages/SetupPasswordPage').then((m) => ({ default: m.SetupPasswordPage })))
const SetupVendorPasswordPage = lazy(() => import('@/pages/SetupVendorPasswordPage').then((m) => ({ default: m.SetupVendorPasswordPage })))

/** Shown for the moment a screen's code is being fetched. */
function ScreenLoading() {
  return <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground" role="status">Loading…</div>
}

export function AppRoutes() {
  return (
    <Suspense fallback={<ScreenLoading />}>
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/vendor/reset-password" element={<ResetPasswordPage kind="vendor" />} />
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
          <Route path="/profile" element={<ProfilePage kind="user" />} />
          <Route path="/platform-config/menu" element={<Guard permission={P.PLATFORM_MENU_CONFIG_VIEW}><MenuConfigPage /></Guard>} />
          <Route path="/platform-config/email" element={<Guard permission={P.PLATFORM_EMAIL_SETTINGS_VIEW}><EmailSettingsPage /></Guard>} />
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
          <Route path="/vendor/profile" element={<ProfilePage kind="vendor" />} />
          <Route path="/vendor/gifts" element={<VendorGiftListPage />} />
          <Route path="/vendor/gifts/new" element={<VendorGiftFormPage />} />
          <Route path="/vendor/gifts/:id" element={<VendorGiftFormPage />} />
          <Route path="/vendor/orders" element={<VendorOrdersPage />} />
          <Route path="/vendor/orders/:id" element={<VendorOrderPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </Suspense>
  )
}
