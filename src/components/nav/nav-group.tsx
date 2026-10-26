import { NavCollapse } from "@/components/nav/nav-collapse";
import { NavItem } from "@/components/nav/nav-item";
import { useNavRail } from "@/components/nav/nav-context";
import type { NavItemType } from "@/components/nav/nav-types";

interface NavGroupProps {
  /** A NavItemType with type "group". */
  item: NavItemType;
}

/** Renders a top-level section label followed by its children (collapse or item nodes). */
export function NavGroup({ item }: NavGroupProps) {
  const { collapsed } = useNavRail();

  return (
    <div aria-label={item.title}>
      {/* No label on the collapsed rail, and no rule in its place either: most groups hold a
          single entry, so a rule per group boxed each icon in its own band while multi-entry
          groups sat tight — an uneven column. One even pitch reads cleaner, and each icon's
          tooltip/flyout still names it. */}
      {!collapsed && <div className="sidebar-section-label">{item.title}</div>}
      {(item.children ?? []).map((child) =>
        child.type === "collapse" ? (
          <NavCollapse key={child.id} item={child} depth={1} />
        ) : (
          <NavItem key={child.id} item={child} depth={1} />
        ),
      )}
    </div>
  );
}
