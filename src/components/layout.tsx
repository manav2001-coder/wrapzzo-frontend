import * as React from "react";
import { Outlet } from "react-router-dom";

import { useAppSelector } from "@/app/hooks";
import { useLogout } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/use-permission";
import { useVendorLogout } from "@/hooks/useVendorAuth";
import { ContentHeader } from "@/components/content-header";
import { ScrollTop } from "@/components/scroll-top";
import { type Portal, type ShellSession, ShellProvider } from "@/components/shell-context";
import { Sidebar } from "@/components/sidebar";

/** The session for the app (company and platform users) or the vendor portal. */
function useShellSession(portal: Portal): ShellSession {
  const appEmail = useAppSelector((state) => state.auth.user?.email ?? null);
  const vendorEmail = useAppSelector((state) => state.vendorAuth.vendor?.email ?? null);
  const appLogout = useLogout();
  const vendorLogout = useVendorLogout();
  const { isPlatformStaff } = usePermissions();

  return React.useMemo<ShellSession>(
    () =>
      portal === "vendor"
        ? {
            portal,
            homePath: "/vendor",
            settingsPath: "/vendor/settings",
            email: vendorEmail,
            signOut: vendorLogout,
          }
        : {
            portal,
            homePath: isPlatformStaff ? "/admin" : "/dashboard",
            settingsPath: "/settings",
            email: appEmail,
            signOut: appLogout,
          },
    [portal, appEmail, vendorEmail, appLogout, vendorLogout, isPlatformStaff],
  );
}

/** Chrome for the authenticated area: dark-navy nav rail + content column. */
export function AppLayout({ portal = "app" }: { portal?: Portal }) {
  /**
   * The scrolling element is this <main>, not the window — so ScrollTop has to be pointed
   * at it.
   */
  const mainRef = React.useRef<HTMLElement>(null);
  const session = useShellSession(portal);

  return (
    <ShellProvider value={session}>
      {/*
        The frame is exactly the viewport: `h-dvh` (not `h-screen`, whose 100vh is taller than the
        visible area on mobile browsers), with the column `min-h-0` so <main> is the one real
        scrollport. `overflow-hidden` on the shell and `relative` on <main> keep an absolutely
        positioned descendant (a popper, Radix's hidden inputs) from ever growing the WINDOW's
        scroll height.
      */}
      <div className="flex h-dvh overflow-hidden bg-background">
        <ScrollTop targetRef={mainRef} />
        <Sidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <ContentHeader />
          {/*
            The shell owns the page padding AND the scrolling; a page never adds its own scroll
            or `min-h-screen`. <main> is a flex column and `.app-page` (index.css) is always
            exactly the available height, so a page root can be a bounded column and let a table
            scroll inside it, while a long page overflows it and scrolls here.
          */}
          <main
            ref={mainRef}
            className="relative flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-contain px-4 pt-4 [scrollbar-gutter:stable] sm:px-6 sm:pt-6"
          >
            <div className="app-page mx-auto w-full max-w-screen-2xl">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </ShellProvider>
  );
}
