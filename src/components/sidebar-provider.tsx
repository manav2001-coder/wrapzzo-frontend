import * as React from "react";

import { useLocalStorage } from "@/hooks/use-local-storage";

export const SIDEBAR_COLLAPSED_KEY = "wrapzzo.sidebar-collapsed";

export interface SidebarState {
  /** Desktop rail is icon-only. Never affects the mobile Sheet nav. */
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  toggle: () => void;
}

const SidebarContext = React.createContext<SidebarState | null>(null);

/**
 * Desktop sidebar collapse state, persisted to localStorage.
 *
 * This is v4's drawer state (`isDashboardDrawerOpened` / `handlerDrawerOpen`, which v4
 * kept in a global SWR store) — NOT v4's `useMenuCollapse`, which auto-opens the parent
 * branches of the active route. `nav-collapse.tsx` already does that via
 * `containsActiveDescendant`.
 *
 * Deliberately no viewport auto-collapse (v4 collapses below `xl`): that needs a
 * `matchMedia` hook plus a jsdom stub, for a nicety nothing asks for yet.
 */
export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useLocalStorage<boolean>(SIDEBAR_COLLAPSED_KEY, false);

  const toggle = React.useCallback(() => setCollapsed((prev) => !prev), [setCollapsed]);

  const value = React.useMemo<SidebarState>(
    () => ({ collapsed, setCollapsed, toggle }),
    [collapsed, setCollapsed, toggle],
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

/**
 * Throws outside a provider rather than returning a default: a silently-always-expanded
 * rail is a bug that looks like a styling problem.
 */
export function useSidebar(): SidebarState {
  const context = React.useContext(SidebarContext);
  if (!context) throw new Error("useSidebar must be used within <SidebarProvider>");
  return context;
}
