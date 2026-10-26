import { Archive, Gift, Megaphone, ShoppingBag, Users, Zap } from "lucide-react";

import { AppBreadcrumbs } from "@/components/app-breadcrumbs";
import { NavGroup } from "@/components/nav/nav-group";
import type { NavItemType } from "@/components/nav/nav-types";
import { AppTabs } from "@/components/app-tabs";
import { CommandPalette } from "@/components/command-palette";
import { NavRailProvider } from "@/components/nav/nav-context";
import { ComponentDemo } from "@/pages/components-showcase/component-demo";

// Demo-only multi-level tree, deeper than the production nav, to show every node type.
const DEMO_TREE: NavItemType = {
  id: "gifting-demo",
  title: "Gifting",
  type: "group",
  children: [
    {
      id: "campaigns-demo",
      title: "Campaigns",
      type: "collapse",
      icon: Megaphone,
      children: [
        { id: "audience", title: "Audience", type: "item", url: "#", icon: Users },
        { id: "gifts", title: "Gifts", type: "item", url: "#", icon: Gift },
        {
          id: "history",
          title: "History",
          type: "collapse",
          icon: Archive,
          children: [
            { id: "active-campaigns", title: "Active", type: "item", url: "#" },
            { id: "closed-campaigns", title: "Closed", type: "item", url: "#", icon: Archive },
          ],
        },
      ],
    },
    {
      id: "fulfilment",
      title: "Fulfilment",
      type: "collapse",
      icon: ShoppingBag,
      children: [
        {
          id: "quick-gift-demo",
          title: "Quick Gift",
          type: "item",
          url: "#",
          icon: Zap,
          badge: { label: "New" },
        },
      ],
    },
  ],
};

export function NavigationSection() {
  return (
    <section id="navigation" className="space-y-4 scroll-mt-20">
      <h2 className="text-lg font-semibold tracking-tight">Navigation</h2>

      <ComponentDemo
        title="NavGroup / NavCollapse / NavItem"
        description="The recursive multi-level nav system the production Sidebar renders."
        code={`const NAV: NavItemType = { id: "gifting", title: "Gifting", type: "group", children: [...] };
<NavGroup item={NAV} />`}
      >
        <div className="sidebar w-64 overflow-hidden rounded-md py-2">
          <NavGroup item={DEMO_TREE} />
        </div>
      </ComponentDemo>

      <ComponentDemo
        title="Collapsed nav rail"
        description="The same tree inside a NavRailProvider: icon-only, tooltip-labelled, and level-1 branches open as a flyout to the right instead of expanding inline."
        code={`<NavRailProvider collapsed>
  <NavGroup item={NAV} />
</NavRailProvider>`}
      >
        <div className="sidebar w-16 overflow-visible rounded-md py-2">
          <NavRailProvider collapsed>
            <NavGroup item={DEMO_TREE} />
          </NavRailProvider>
        </div>
      </ComponentDemo>

      <ComponentDemo
        title="AppTabs"
        description="Config-driven tabs. `underline` is the default; `pills` is shadcn's own look."
        code={`<AppTabs
  tabs={[
    { value: "audience", label: "Audience", icon: Users, content: <AudienceList /> },
    { value: "submissions", label: "Submissions", badge: 4, content: <SubmissionList /> },
    { value: "audit", label: "Audit", disabled: true },
  ]}
/>`}
      >
        <div className="w-full space-y-6">
          <AppTabs
            tabs={[
              {
                value: "audience",
                label: "Audience",
                content: <p className="pt-3 text-sm">Everyone in Zone North.</p>,
              },
              {
                value: "submissions",
                label: "Submissions",
                badge: 4,
                content: <p className="pt-3 text-sm">4 recipients submitted today.</p>,
              },
              { value: "audit", label: "Audit", disabled: true, content: <p>-</p> },
            ]}
          />
          <AppTabs
            variant="pills"
            fullWidth
            tabs={[
              {
                value: "a",
                label: "Pills",
                content: <p className="pt-3 text-sm">Pills variant, full width.</p>,
              },
              {
                value: "b",
                label: "Variant",
                content: <p className="pt-3 text-sm">Second panel.</p>,
              },
            ]}
          />
        </div>
      </ComponentDemo>

      <ComponentDemo
        title="CommandPalette"
        description="⌘K palette. Its default actions are derived from the sidebar's own NAV via flattenNavItems, so the two cannot drift."
        code={`<CommandPalette />
// or supply your own:
<CommandPalette actions={[{ id: "orders", label: "Open orders", to: "/orders" }]} />`}
      >
        <CommandPalette />
      </ComponentDemo>

      <ComponentDemo
        title="AppBreadcrumbs"
        description="Derives crumbs from the current route path - not tied to a global menu tree."
        code={`<AppBreadcrumbs />`}
      >
        <AppBreadcrumbs />
      </ComponentDemo>
    </section>
  );
}
