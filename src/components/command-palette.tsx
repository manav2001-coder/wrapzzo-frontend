import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import { LogOut, Search, SunMoon, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useNav } from "@/components/nav/use-nav";
import { flattenNavItems } from "@/components/nav/nav-types";
import { revealInNav } from "@/components/nav/nav-reveal";
import { useShell } from "@/components/shell-context";

export interface CommandAction {
  id: string;
  label: string;
  group?: string;
  icon?: LucideIcon;
  shortcut?: string;
  keywords?: string[];
  /** Navigate to this route. */
  to?: string;
  /** Or run this. */
  onSelect?: () => void;
}

export interface CommandPaletteProps {
  /** Overrides the defaults derived from the sidebar nav plus theme and sign-out. */
  actions?: CommandAction[];
  className?: string;
}

/**
 * ⌘K command palette, with a faux search box in the header as its trigger.
 *
 * Default actions are derived from the SAME `useNav()` tree the sidebar renders (via
 * `flattenNavItems`) rather than a second hardcoded route list, so the two cannot drift
 * — including the permission filtering, so the palette cannot jump you to a 403.
 */
export function CommandPalette({ actions, className }: CommandPaletteProps) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const navigate = useNavigate();
  const { signOut } = useShell();
  const { setTheme, resolvedTheme } = useTheme();
  const nav = useNav();

  const handleSignOut = React.useCallback(() => {
    signOut();
    navigate("/login");
  }, [signOut, navigate]);

  const resolved = React.useMemo<CommandAction[]>(() => {
    if (actions) return actions;
    const navigationGroup = t("commandPalette.navigation");
    const actionsGroup = t("commandPalette.actions");
    return [
      ...flattenNavItems(nav).map((item) => ({
        id: `nav-${item.id}`,
        label: item.title,
        group: navigationGroup,
        icon: item.icon,
        to: item.url,
      })),
      {
        id: "toggle-theme",
        label: t("a11y.toggleTheme"),
        group: actionsGroup,
        icon: SunMoon,
        keywords: ["dark", "light", "appearance"],
        onSelect: () => setTheme(resolvedTheme === "dark" ? "light" : "dark"),
      },
      {
        id: "sign-out",
        label: t("action.signOut"),
        group: actionsGroup,
        icon: LogOut,
        keywords: ["logout", "exit"],
        onSelect: handleSignOut,
      },
    ];
  }, [actions, nav, resolvedTheme, setTheme, handleSignOut, t]);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        // Firefox binds ⌘K/Ctrl+K to its own search bar, so this has to be claimed.
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const run = (action: CommandAction) => {
    setOpen(false);
    if (action.to) {
      navigate(action.to);
      // Show where it lives: the sidebar opens its group and brings the entry to the top.
      revealInNav(action.to);
      return;
    }
    action.onSelect?.();
  };

  const groups = React.useMemo(() => {
    const byGroup = new Map<string, CommandAction[]>();
    for (const action of resolved) {
      const key = action.group ?? t("commandPalette.actions");
      byGroup.set(key, [...(byGroup.get(key) ?? []), action]);
    }
    return [...byGroup.entries()];
  }, [resolved, t]);

  return (
    <>
      {/* The faux-input trigger. */}
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className={cn(
          "hidden h-8 w-56 justify-start px-3 font-normal text-muted-foreground md:flex",
          className,
        )}
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="flex-1 text-left">{t("a11y.searchPlaceholder")}</span>
        <kbd className="pointer-events-none rounded border border-border bg-muted px-1.5 font-mono text-[10px]">
          ⌘K
        </kbd>
      </Button>

      {/* Icon-only fallback on narrow viewports. */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={t("a11y.search")}
        onClick={() => setOpen(true)}
        className="md:hidden"
      >
        <Search />
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder={t("a11y.searchPages")} />
        <CommandList>
          <CommandEmpty>{t("commandPalette.noMatches")}</CommandEmpty>
          {groups.map(([group, items]) => (
            <CommandGroup key={group} heading={group}>
              {items.map((action) => (
                <CommandItem
                  key={action.id}
                  value={[action.label, ...(action.keywords ?? [])].join(" ")}
                  onSelect={() => run(action)}
                >
                  {action.icon && <action.icon className="mr-2 h-4 w-4" />}
                  <span className="flex-1">{action.label}</span>
                  {action.shortcut && (
                    <kbd className="ml-auto font-mono text-xs text-muted-foreground">
                      {action.shortcut}
                    </kbd>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
