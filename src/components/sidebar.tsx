import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/use-permission";
import { Skeleton } from "@/components/ui/skeleton";
import { NavGroup } from "@/components/nav/nav-group";
import { NavRailProvider } from "@/components/nav/nav-context";
import { useNav } from "@/components/nav/use-nav";
import { useShell } from "@/components/shell-context";
import { useSidebar } from "@/components/sidebar-provider";
import { WrapzzoLogo } from "@/components/wrapzzo-logo";

interface SidebarNavProps {
  /** Render icon-only with tooltips and flyout submenus. */
  collapsed?: boolean;
}

/**
 * The nav-list contents, shared between the fixed desktop rail and the mobile drawer.
 *
 * The tree comes from `useNav`, which translates the titles and drops anything the
 * caller lacks permission for — the command palette derives its navigation actions from
 * the same hook, so the two can never drift.
 */
export function SidebarNav({ collapsed = false }: SidebarNavProps) {
  const nav = useNav();
  const { t } = useTranslation();
  const { portal } = useShell();
  const permissions = usePermissions();
  // The vendor portal has no permission set to load or fail.
  const loading = portal === "app" && permissions.loading;
  const error = portal === "app" && permissions.error;

  return (
    <NavRailProvider collapsed={collapsed}>
      <nav className="flex-1 overflow-y-auto py-2">
        {/*
         * Say what happened instead of rendering a plausible, wrong menu: `useNav` returns
         * nothing when the profile could not be loaded, because filtering an empty permission
         * set produces exactly the sidebar of a user with no access. Hidden when collapsed,
         * where there is no room for prose.
         */}
        {error && !collapsed ? (
          <div className="mx-3 my-2 rounded-md border border-white/15 bg-white/[0.06] p-3">
            <p className="text-xs text-white/70">{t("nav.loadFailed")}</p>
            <button
              type="button"
              onClick={() => void permissions.refetchPermissions()}
              className="mt-2 text-xs font-medium text-white underline underline-offset-2"
            >
              {t("action.retry")}
            </button>
          </div>
        ) : null}

        {/* Placeholders while the profile loads: an empty rail reads as "no access". */}
        {loading ? (
          <div
            role="status"
            aria-label={t("nav.loading")}
            className="space-y-3 px-3 py-2"
            data-testid="nav-skeleton"
          >
            {Array.from({ length: 9 }, (_, i) => (
              <Skeleton key={i} className="h-5 w-full bg-white/10" />
            ))}
          </div>
        ) : null}

        {nav.map((group) => (
          <NavGroup key={group.id} item={group} />
        ))}
      </nav>
    </NavRailProvider>
  );
}

/**
 * Dark-navy nav rail for the authenticated shell. Hidden below `lg` — see
 * <ContentHeader>'s mobile drawer, which always renders the nav EXPANDED regardless of
 * this rail's collapsed state.
 */
export function Sidebar() {
  const { collapsed } = useSidebar();
  const { homePath } = useShell();

  return (
    <aside
      className={cn(
        "sidebar sticky top-0 hidden h-screen flex-shrink-0 flex-col transition-[width] duration-200 lg:flex",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div
        className={cn(
          "border-b border-sidebar-border py-4",
          collapsed ? "flex justify-center px-2" : "px-4",
        )}
      >
        {/* No aria-label here: the logo already names this link. Collapsed, only the mark shows. */}
        <Link to={homePath} className="block" data-testid="sidebar-logo-link">
          <WrapzzoLogo variant={collapsed ? "mark" : "full"} height={collapsed ? 26 : 28} />
        </Link>
      </div>
      <SidebarNav collapsed={collapsed} />
    </aside>
  );
}
