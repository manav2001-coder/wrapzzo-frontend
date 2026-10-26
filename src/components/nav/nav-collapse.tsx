import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { NavItem } from "@/components/nav/nav-item";
import { NavRailProvider, useNavRail } from "@/components/nav/nav-context";
import { useNavReveal } from "@/components/nav/nav-reveal";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  containsActiveDescendant,
  navContents,
  navGuideId,
  type NavItemType,
} from "@/components/nav/nav-types";

/** Whether any item under `item` has this url. */
function containsUrl(item: NavItemType, url: string): boolean {
  return item.url === url || (item.children ?? []).some((child) => containsUrl(child, url));
}

interface NavCollapseProps {
  item: NavItemType;
  depth: number;
}

/**
 * A recursive expandable nav branch. Each branch owns its own open/closed state
 * independently (no shared "only one branch open" coordination) — that coordination
 * only matters for mega-menu nav modes mobixfl doesn't have; independent toggling is
 * simpler and has nothing to prop-drill.
 *
 * In a collapsed rail the inline expansion becomes a `Popover` flyout to the right.
 * `Popover` rather than `DropdownMenu` because the children are `NavLink`s and nested
 * branches: a menu's `menuitem` roving focus and typeahead fight both. v4 used Popper +
 * Paper here for the same reason, not a MUI `Menu`.
 */
export function NavCollapse({ item, depth }: NavCollapseProps) {
  const { pathname } = useLocation();
  const { collapsed } = useNavRail();
  const [open, setOpen] = useState(() => containsActiveDescendant(item, pathname));
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const revealed = useNavReveal((url) => containsUrl(item, url));
  // A stable handle for LogiClick, and the entries this branch hides while it is closed.
  const contents = navContents(item);
  const guideProps = {
    "data-guide-id": navGuideId(item),
    "data-nav-urls": contents.urls,
    "data-nav-ids": contents.ids,
  };

  // A page reached some other way than this rail (the palette, a link in a screen) opens the
  // branch that holds it. It only ever opens, and only when the answer changes (the dependencies
  // are the answers, not the item, which is a new object each render): closing is the user's.
  const holdsActive = containsActiveDescendant(item, pathname);
  useEffect(() => {
    if (holdsActive) setOpen(true);
  }, [holdsActive, pathname]);
  useEffect(() => {
    if (revealed !== 0) setOpen(true);
  }, [revealed]);

  // Close the flyout after navigating, or it hangs over the new page.
  useEffect(() => {
    setFlyoutOpen(false);
  }, [pathname]);

  const children = (item.children ?? []).map((child) =>
    child.type === "collapse" ? (
      <NavCollapse key={child.id} item={child} depth={depth + 1} />
    ) : (
      <NavItem key={child.id} item={child} depth={depth + 1} />
    ),
  );

  if (collapsed) {
    const isActiveBranch = containsActiveDescendant(item, pathname);
    return (
      <Popover open={flyoutOpen} onOpenChange={setFlyoutOpen}>
        {/* The same hover name the collapsed `NavItem` links carry: without it a group icon
            said nothing until clicked. Radix closes a tooltip on press, so it never sits on
            top of the flyout it opens. */}
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                type="button"
                {...guideProps}
                aria-label={item.title}
                aria-expanded={flyoutOpen}
                className={cn(
                  // `my-1` matches the collapsed `NavItem`, so every rail icon sits on one pitch.
                  "sidebar-collapse-trigger my-1 justify-center px-0",
                  isActiveBranch && "active",
                )}
              >
                {item.icon && <item.icon className="h-[18px] w-[18px] flex-shrink-0" />}
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="right">{item.title}</TooltipContent>
        </Tooltip>
        <PopoverContent
          side="right"
          align="start"
          // `bg-sidebar` as a UTILITY, not just the `.sidebar` class: PopoverContent's own
          // `bg-popover` is a utility too and outranks a components-layer rule, so the flyout
          // went white in light mode while its items kept the sidebar's light text.
          className="sidebar w-56 border-sidebar-border bg-sidebar p-1"
        >
          <div className="sidebar-section-label">{item.title}</div>
          {/* Children render EXPANDED inside the flyout — only level 1 flies out; deeper
              branches stay inline, matching v4 and avoiding nested portal focus traps. */}
          <NavRailProvider collapsed={false}>{children}</NavRailProvider>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div>
      <button
        type="button"
        {...guideProps}
        onClick={() => setOpen((o) => !o)}
        style={{ paddingLeft: `${0.75 + depth * 0.875}rem` }}
        className="sidebar-collapse-trigger text-left"
        aria-expanded={open}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2.5">
          {item.icon && <item.icon className="h-3.5 w-3.5 flex-shrink-0" />}
          <span className="flex-1">{item.title}</span>
        </span>
        <ChevronRight
          className={cn("h-3.5 w-3.5 flex-shrink-0 transition-transform", open && "rotate-90")}
        />
      </button>
      {open && <div className="sidebar-expand">{children}</div>}
    </div>
  );
}
