import * as React from "react";

interface NavRailState {
  /** Render the nav icon-only, with tooltips and flyout submenus. */
  collapsed: boolean;
}

const NavRailContext = React.createContext<NavRailState>({ collapsed: false });

/**
 * Tells the nav tree whether it is rendering inside a collapsed rail.
 *
 * Deliberately SEPARATE from `SidebarProvider`: the mobile Sheet drawer in
 * `content-header.tsx` must render the nav EXPANDED even while the desktop rail is
 * collapsed. If `nav-item` read `useSidebar()` directly it would collapse the mobile
 * drawer too. Keeping it a prop-free context also leaves `NavGroup`'s public API
 * (`<NavGroup item={…} />`) unchanged, so existing tests and the showcase demo still work.
 *
 * Defaults to expanded, so any nav rendered without a provider behaves as before.
 */
export function NavRailProvider({
  collapsed,
  children,
}: {
  collapsed: boolean;
  children: React.ReactNode;
}) {
  const value = React.useMemo(() => ({ collapsed }), [collapsed]);
  return <NavRailContext.Provider value={value}>{children}</NavRailContext.Provider>;
}

export function useNavRail(): NavRailState {
  return React.useContext(NavRailContext);
}
