import { Sidebar as MobileDrawer } from 'primereact/sidebar'
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { toggleSidebar } from '@/features/ui/uiSlice'
import { VendorSidebarContent } from '@/modules/vendor/VendorSidebarContent'
import { VendorTopbar } from '@/modules/vendor/VendorTopbar'

/** Mirrors AppLayout's shell -- now that the vendor portal has more than one tab, it earns the same sidebar. */
export function VendorLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const dispatch = useAppDispatch()
  const collapsed = useAppSelector((state) => state.ui.sidebarCollapsed)

  return (
    <div className="flex h-svh bg-bg">
      <aside className={`hidden shrink-0 transition-[width] duration-200 lg:block ${collapsed ? 'w-[72px]' : 'w-64'}`}>
        <VendorSidebarContent collapsed={collapsed} onToggleCollapse={() => dispatch(toggleSidebar())} />
      </aside>

      <MobileDrawer visible={mobileNavOpen} onHide={() => setMobileNavOpen(false)} showCloseIcon={false} className="w-72 p-0">
        <VendorSidebarContent onNavigate={() => setMobileNavOpen(false)} />
      </MobileDrawer>

      <div className="flex min-w-0 flex-1 flex-col">
        <VendorTopbar onOpenMobileNav={() => setMobileNavOpen(true)} />
        <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-5xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
