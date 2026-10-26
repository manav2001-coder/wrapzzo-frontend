import * as React from "react";
import { Link } from "react-router-dom";
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useTranslation } from "react-i18next";

import { AccountMenu } from "@/components/account-menu";
import { CommandPalette } from "@/components/command-palette";
import { FullscreenToggle } from "@/components/fullscreen-toggle";
import { IconButton } from "@/components/icon-button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useShell } from "@/components/shell-context";
import { SidebarNav } from "@/components/sidebar";
import { useSidebar } from "@/components/sidebar-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { WrapzzoLogo } from "@/components/wrapzzo-logo";
import { currentLocale, usableLocale } from "@/lib/i18n";

/** `14:32 IST` in this browser's timezone, ticking every 30s — cheap enough for a header. */
function HeaderClock() {
  const [now, setNow] = React.useState(() => new Date());

  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const label = new Intl.DateTimeFormat(usableLocale(currentLocale()), {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZoneName: "short",
  }).format(now);

  return (
    <span className="hidden font-mono text-xs tabular-nums text-muted-foreground sm:inline">
      {label}
    </span>
  );
}

/**
 * Slim strip atop the content column: mobile nav trigger, sidebar collapse toggle, command
 * palette, clock, language, fullscreen, theme toggle and the account menu.
 */
export function ContentHeader() {
  const { t } = useTranslation();
  const { collapsed, toggle } = useSidebar();
  const { homePath } = useShell();

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-1 border-b border-border bg-background/80 px-4 backdrop-blur">
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label={t("a11y.openNavigation")}
          >
            <Menu />
          </Button>
        </SheetTrigger>
        {/* The drawer carries the rail's dark-navy surface, so the nav reads the same on a phone. */}
        <SheetContent side="left" className="sidebar flex w-60 flex-col p-0">
          <SheetHeader className="border-b border-sidebar-border px-4 py-4 text-left">
            <SheetTitle asChild>
              <Link to={homePath} className="inline-block">
                <WrapzzoLogo height={28} />
              </Link>
            </SheetTitle>
          </SheetHeader>
          {/* Always expanded: the mobile drawer has room for labels even when the
              desktop rail is collapsed. */}
          <SidebarNav />
        </SheetContent>
      </Sheet>

      <IconButton
        icon={collapsed ? PanelLeftOpen : PanelLeftClose}
        label={collapsed ? t("nav.expandSidebar") : t("nav.collapseSidebar")}
        aria-expanded={!collapsed}
        onClick={toggle}
        className="hidden lg:inline-flex"
      />

      <CommandPalette className="ml-2" />

      <div className="ml-auto flex items-center gap-3">
        <HeaderClock />
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <FullscreenToggle />
          <ThemeToggle />
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}
