import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import { ExternalLink, LogOut, User, type LucideIcon } from "lucide-react";

import { useCurrentUser } from "@/hooks/use-current-user";
import { useProfile } from "@/hooks/use-profile";
import { useShell } from "@/components/shell-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  /** Added to the list under the name. */
  profileItems?: AccountMenuItem[];
  /** Added to the list under the name, after the profile items. */
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
 * The account menu: who is signed in, a way to their profile, the appearance choice and a plainly labelled Sign out -- one panel,
 * no tabs, since there is little enough in it to see at once.
 */
export function AccountMenu({ profileItems = [], settingsItems = [] }: AccountMenuProps) {
  const { t } = useTranslation();
  const { portal, email, signOut } = useShell();
  const { data: user } = useCurrentUser();
  // A person's picture comes with /me; a vendor's logo is read from their own profile.
  const { data: vendorProfile } = useProfile("vendor");
  const photoUrl = portal === "vendor" ? vendorProfile?.photoUrl : user?.photoUrl;
  const name = portal === "vendor" ? vendorProfile?.name : user?.name;
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
            {photoUrl && <AvatarImage src={photoUrl} alt="" />}
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 max-w-[calc(100vw-1.5rem)] p-0">
        {/* Who is signed in: the name first (it is what people recognise), then the email in full -- never cut off -- and the company. */}
        <div className="flex items-center gap-3 p-4">
          <Avatar className="h-12 w-12">
            {photoUrl && <AvatarImage src={photoUrl} alt="" />}
            <AvatarFallback className="text-sm">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            {name && <p className="truncate text-sm font-semibold">{name}</p>}
            <p className={name ? "break-all text-xs text-muted-foreground" : "break-all text-sm font-medium"}>{email ?? t("account.signedIn")}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>

        <div className="border-t p-2">
          <MenuItemList
            items={[
              { id: "my-profile", label: t("account.myProfile"), icon: User, to: portal === "vendor" ? "/vendor/profile" : "/profile" },
              ...profileItems,
              ...settingsItems,
            ]}
            onNavigate={close}
          />
        </div>

        <div className="space-y-1.5 border-t px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground">{t("settings.appearance")}</p>
          <ToggleGroup type="single" value={theme ?? "system"} onValueChange={(next) => next && setTheme(next)} className="w-full justify-start">
            {(["light", "dark", "system"] as const).map((option) => (
              <ToggleGroupItem key={option} value={option} aria-label={t("account.themeOption", { name: t(`settings.theme.${option}`) })} className="flex-1 text-xs">
                {t(`settings.theme.${option}`)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <div className="border-t p-2">
          <Button type="button" variant="ghost" size="sm" className="w-full justify-start gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
            {t("action.signOut")}
          </Button>
        </div>
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
