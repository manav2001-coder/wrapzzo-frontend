import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface AppTabItem {
  value: string;
  label: React.ReactNode;
  icon?: LucideIcon;
  badge?: string | number;
  disabled?: boolean;
  /** Omit for a tab bar only (controlled usage where the caller renders the panel). */
  content?: React.ReactNode;
}

export interface AppTabsProps {
  tabs: AppTabItem[];
  /** Controlled. Omit (with `defaultValue`) to let the component own the state. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** `underline` is the v4/MUI look; `pills` is shadcn's default. */
  variant?: "pills" | "underline";
  /** v4's `variant="fullWidth"`. */
  fullWidth?: boolean;
  /** v4's `variant="scrollable"`. */
  scrollable?: boolean;
  className?: string;
  /** Rendered at the right-hand end of the tab bar, level with the tabs — a control that applies to every tab. */
  trailing?: React.ReactNode;
  listClassName?: string;
  contentClassName?: string;
}

/**
 * Config-driven tabs: the `CustomTabs` equivalent. Pass `tabs` instead of hand-writing a
 * TabsList/TabsTrigger/TabsContent triple per tab.
 */
export function AppTabs({
  tabs,
  value,
  defaultValue,
  onValueChange,
  variant = "underline",
  fullWidth,
  scrollable = true,
  className,
  trailing,
  listClassName,
  contentClassName,
}: AppTabsProps) {
  const first = tabs.find((tab) => !tab.disabled)?.value ?? tabs[0]?.value;
  const hasContent = tabs.some((tab) => tab.content !== undefined);

  return (
    <Tabs
      value={value}
      defaultValue={value === undefined ? (defaultValue ?? first) : undefined}
      onValueChange={onValueChange}
      className={className}
    >
      <div
        className={cn(
          trailing && "flex flex-wrap items-end justify-between gap-x-4 gap-y-2 pb-2",
          trailing && variant === "underline" && "border-b border-border pb-0",
        )}
      >
        <TabsList
          className={cn(
            variant === "underline" &&
              "h-auto justify-start rounded-none border-b border-border bg-transparent p-0",
            fullWidth && "w-full",
            scrollable && "max-w-full overflow-x-auto",
            trailing && variant === "underline" && "min-w-0 flex-1 border-b-0",
            listClassName,
          )}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                disabled={tab.disabled}
                className={cn(
                  "gap-2",
                  variant === "underline" &&
                    "rounded-none border-b-2 border-transparent px-4 pb-2.5 pt-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                  fullWidth && "flex-1",
                )}
              >
                {Icon && <Icon className="h-4 w-4" />}
                {tab.label}
                {tab.badge !== undefined && (
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                    {tab.badge}
                  </Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>
        {trailing}
      </div>

      {hasContent &&
        tabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className={contentClassName}>
            {tab.content}
          </TabsContent>
        ))}
    </Tabs>
  );
}
