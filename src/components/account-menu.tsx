import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import { ExternalLink, LogOut, Settings, User, type LucideIcon } from "lucide-react";

import { useCurrentUser } from "@/hooks/use-current-user";
import { AppTabs } from "@/components/app-tabs";
import { IconButton } from "@/components/icon-button";
import { useShell } from "@/components/shell-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export interface AccountMenuItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  /** Internal route. */
  to?: string;
  /** External URL — opened in a new tab. */
  href?: string;
  onSelect?: () => void;
}

export interface AccountMenuProps {
  /** Appended to the Profile tab. */
  profileItems?: AccountMenuItem[];
  /** Appended to the Settings tab. */
  settingsItems?: AccountMenuItem[];
}

/** Two letters for the avatar: the email's local part, split on dots/underscores. */
export function initialsFromEmail(email: string | null | undefined): string {
  if (!email) return "?";
  const parts = email.split("@")[0].split(/[._-]+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0]?.slice(0, 2);
  return letters ? letters.toUpperCase() : "?";
}

/**
 * The account menu, with a Profile / Settings tab split.
 *
 * Built on `Popover`, NOT `DropdownMenu`: Radix `Tabs` inside a `DropdownMenuContent` has its
 * arrow keys and typeahead swallowed by the menu's own roving focus, so the tab triggers never
 * see them.
 */
export function AccountMenu({ profileItems = [], settingsItems = [] }: AccountMenuProps) {
  const { t } = useTranslation();
  const { portal, email, settingsPath, signOut } = useShell();
  const { data: user } = useCurrentUser();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = React.useState(false);

  const initials = initialsFromEmail(email);
  // A company user sees their company; platform staff and vendors see who they are signed in as.
  const subtitle =
    portal === "vendor" ? t("account.vendorPortal") : (user?.companyName ?? t("account.platformStaff"));

  const handleSignOut = () => {
    setOpen(false);
    signOut();
    navigate("/login");
  };

  const close = () => setOpen(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("account.label")}>
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-0">
        <div className="flex items-center gap-3 p-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{email ?? t("account.signedIn")}</p>
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <IconButton
            icon={LogOut}
            label={t("action.signOut")}
            tone="destructive"
            size="sm"
            // Points left, not down: the default bottom placement lands the tooltip
            // squarely over the Settings tab inside this narrow popover.
            tooltipSide="left"
            onClick={handleSignOut}
          />
        </div>

        <AppTabs
          variant="pills"
          fullWidth
          className="px-3"
          contentClassName="p-2"
          tabs={[
            {
              value: "profile",
              label: t("account.profile"),
              icon: User,
              content: (
                <MenuItemList
                  items={[
                    {
                      id: "settings",
                      label: t("account.accountSettings"),
                      icon: Settings,
                      to: settingsPath,
                    },
                    ...profileItems,
                  ]}
                  onNavigate={close}
                />
              ),
            },
            {
              value: "settings",
              label: t("settings.title"),
              icon: Settings,
              content: (
                <div className="space-y-3">
                  <div className="space-y-1.5 px-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      {t("settings.appearance")}
                    </p>
                    <ToggleGroup
                      type="single"
                      value={theme ?? "system"}
                      onValueChange={(next) => next && setTheme(next)}
                      className="justify-start"
                    >
                      {(["light", "dark", "system"] as const).map((option) => (
                        <ToggleGroupItem
                          key={option}
                          value={option}
                          aria-label={t("account.themeOption", {
                            name: t(`settings.theme.${option}`),
                          })}
                          className="text-xs"
                        >
                          {t(`settings.theme.${option}`)}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </div>
                  {settingsItems.length > 0 && (
                    <MenuItemList items={settingsItems} onNavigate={close} />
                  )}
                </div>
              ),
            },
          ]}
        />
      </PopoverContent>
    </Popover>
  );
}

function MenuItemList({ items, onNavigate }: { items: AccountMenuItem[]; onNavigate: () => void }) {
  return (
    <ul className="space-y-0.5">
      {items.map((item) => {
        const Icon = item.icon;
        const content = (
          <>
            {Icon && <Icon className="h-4 w-4" />}
            <span className="flex-1 text-left">{item.label}</span>
            {item.href && <ExternalLink className="h-3 w-3 opacity-50" />}
          </>
        );

        return (
          <li key={item.id}>
            {item.to ? (
              <Button asChild variant="ghost" size="sm" className="w-full justify-start gap-2">
                <Link to={item.to} onClick={onNavigate}>
                  {content}
                </Link>
              </Button>
            ) : item.href ? (
              <Button asChild variant="ghost" size="sm" className="w-full justify-start gap-2">
                <a href={item.href} target="_blank" rel="noreferrer" onClick={onNavigate}>
                  {content}
                </a>
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => {
                  onNavigate();
                  item.onSelect?.();
                }}
              >
                {content}
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
