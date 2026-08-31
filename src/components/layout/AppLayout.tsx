import { Sidebar as MobileDrawer } from 'primereact/sidebar'
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { SidebarContent } from '@/components/layout/SidebarContent'
import { Topbar } from '@/components/layout/Topbar'
import { toggleSidebar } from '@/features/ui/uiSlice'

export function AppLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const dispatch = useAppDispatch()
  const collapsed = useAppSelector((state) => state.ui.sidebarCollapsed)

  return (
    <div className="flex h-svh bg-bg">
      <aside className={`hidden shrink-0 transition-[width] duration-200 lg:block ${collapsed ? 'w-[72px]' : 'w-64'}`}>
        <SidebarContent collapsed={collapsed} onToggleCollapse={() => dispatch(toggleSidebar())} />
      </aside>

      <MobileDrawer visible={mobileNavOpen} onHide={() => setMobileNavOpen(false)} showCloseIcon={false} className="w-72 p-0">
        <SidebarContent onNavigate={() => setMobileNavOpen(false)} />
      </MobileDrawer>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenMobileNav={() => setMobileNavOpen(true)} />
        <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {/* max-w-7xl (1280px) left real MacBook screens with ~100px of dead margin on each
              side once the sidebar's accounted for -- 1600px comfortably fills a 16" MacBook
              Pro's content area while still capping on genuinely ultra-wide external monitors. */}
          <div className="mx-auto w-full max-w-[1600px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
