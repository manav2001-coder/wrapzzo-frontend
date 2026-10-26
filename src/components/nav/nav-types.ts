import type { LucideIcon } from "lucide-react";
import type { BadgeProps } from "@/components/ui/badge";

export interface NavBadge {
  label: string;
  variant?: BadgeProps["variant"];
}

/**
 * A recursive nav tree: "group" nodes are top-level sections (a section label plus
 * children), "collapse" nodes are expandable branches (can nest), "item" nodes are
 * leaf links. Deliberately smaller than a v4-style menu-item shape (no i18n, mini-drawer,
 * or mega-menu fields) — add fields only when a real screen needs them.
 */
export interface NavItemType {
  id: string;
  title: string;
  type: "group" | "collapse" | "item";
  icon?: LucideIcon;
  /** Route path. Only meaningful for type "item". */
  url?: string;
  /** Passed through to NavLink's `end` prop for exact-match highlighting. */
  end?: boolean;
  badge?: NavBadge;
  children?: NavItemType[];
}

/** True if `pathname` matches this item's own url or any descendant item's url. */
export function containsActiveDescendant(item: NavItemType, pathname: string): boolean {
  if (item.type === "item") return item.url === pathname;
  return (item.children ?? []).some((child) => containsActiveDescendant(child, pathname));
}

/**
 * The `data-guide-id` of a sidebar entry or group header — its config id, which neither a
 * translation nor Menu Configuration (names and order only) can change. LogiClick's recorder
 * captures these, and its engine treats a `nav.`/`shell.` target as reachable from every page.
 */
export const navGuideId = (item: Pick<NavItemType, "id">) => `nav.${item.id}`;

/**
 * What a branch hides while it is closed — every descendant's url and id, space-separated, for
 * `data-nav-urls`/`data-nav-ids`. LogiClick's guide uses them to point at the closed group when
 * the link it wants is inside one.
 */
export function navContents(item: NavItemType): { urls: string; ids: string } {
  const urls: string[] = [];
  const ids: string[] = [];
  const walk = (nodes: NavItemType[]) => {
    for (const node of nodes) {
      ids.push(node.id);
      if (node.url) urls.push(node.url);
      walk(node.children ?? []);
    }
  };
  walk(item.children ?? []);
  return { urls: urls.join(" "), ids: ids.join(" ") };
}

/**
 * Every leaf ("item") node in a nav tree, depth-first.
 *
 * Lets the command palette derive its navigation actions from the SAME `NAV` the sidebar
 * renders, instead of a second hardcoded route list that would drift.
 */
export function flattenNavItems(items: NavItemType[]): NavItemType[] {
  return items.flatMap((item) =>
    item.type === "item" ? [item] : flattenNavItems(item.children ?? []),
  );
}
