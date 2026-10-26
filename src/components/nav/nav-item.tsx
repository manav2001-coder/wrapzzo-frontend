import * as React from "react";
import { NavLink, useMatch } from "react-router-dom";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Dot } from "@/components/dot";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavRail } from "@/components/nav/nav-context";
import { useNavReveal } from "@/components/nav/nav-reveal";
import { navGuideId, type NavItemType } from "@/components/nav/nav-types";

interface NavItemProps {
  item: NavItemType;
  depth: number;
}

/** Leaf nav link. `depth` controls indentation for nested branches. */
export function NavItem({ item, depth }: NavItemProps) {
  const { collapsed } = useNavRail();
  /**
   * Active state computed here rather than via NavLink's `className` render prop.
   * In the collapsed branch the link is wrapped in `<TooltipTrigger asChild>`, and Radix's
   * asChild MERGES className as a string — handed a function it stringifies the function
   * source, so the element ends up with the literal text of the callback as its class list
   * and loses all styling. A plain string is safe in both branches.
   */
  const match = useMatch({ path: item.url ?? "/__no-match__", end: item.end ?? false });
  const isActive = Boolean(match);

  // Chosen from the palette: scroll to the top of the rail once its group has finished opening,
  // and pulse so the eye finds it. The request may arrive before this entry has mounted.
  const revealed = useNavReveal((url) => url === item.url);
  const ref = React.useRef<HTMLAnchorElement>(null);
  const [pulsing, setPulsing] = React.useState(false);
  React.useEffect(() => {
    if (collapsed || revealed === 0) return;
    setPulsing(true);
    const scroll = window.setTimeout(() => {
      const calm = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      ref.current?.scrollIntoView?.({ block: "start", behavior: calm ? "auto" : "smooth" });
    }, 220);
    const stop = window.setTimeout(() => setPulsing(false), 2200);
    return () => {
      window.clearTimeout(scroll);
      window.clearTimeout(stop);
    };
  }, [revealed, collapsed]);

  if (collapsed) {
    // `justify-center px-0` are plain utilities, and Tailwind's utilities layer outranks
    // `.sidebar-nav-item`'s components-layer padding — so no `!important` is needed.
    const link = (
      <NavLink
        to={item.url ?? "#"}
        end={item.end}
        data-guide-id={navGuideId(item)}
        aria-label={item.title}
        className={cn("sidebar-nav-item relative my-1 justify-center px-0", isActive && "active")}
      >
        {item.icon && <item.icon className="h-[18px] w-[18px] flex-shrink-0" />}
        {/* A collapsed rail has no room for a badge's text, so it becomes a status dot. */}
        {item.badge && <Dot color="primary" className="absolute right-1.5 top-1.5" />}
      </NavLink>
    );

    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">
          {item.title}
          {item.badge && ` · ${item.badge.label}`}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <NavLink
      ref={ref}
      to={item.url ?? "#"}
      end={item.end}
      data-guide-id={navGuideId(item)}
      data-revealed={pulsing ? "true" : undefined}
      style={{ paddingLeft: `${0.75 + depth * 0.875}rem` }}
      className={({ isActive }) =>
        cn("sidebar-nav-item scroll-mt-14", isActive && "active", pulsing && "sidebar-reveal")
      }
    >
      {item.icon && <item.icon className="h-3.5 w-3.5 flex-shrink-0" />}
      <span className="flex-1">{item.title}</span>
      {item.badge && (
        <Badge variant={item.badge.variant} className="px-1.5 py-0 text-[10px]">
          {item.badge.label}
        </Badge>
      )}
    </NavLink>
  );
}
