import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { VALUE_COLOR_CLASSES, type StatColor } from "@/components/stat-color";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export interface StatCardProps {
  title: string;
  value: number | string;
  /** Renders truncated at `compact` size rather than being suppressed — the Fleet Command
   *  Center's compact KPI tiles need to say "{agent} not yet installed" for a null value
   *  (`docs/fleet-platform/01-fleet-command-center.md` §6.2), so hiding it in compact mode
   *  would silently drop that empty-state message. */
  description?: string;
  icon?: LucideIcon;
  color?: StatColor;
  loading?: boolean;
  onClick?: () => void;
  active?: boolean;
  valueFormatter?: (value: number | string) => string;
  compact?: boolean;
  className?: string;
}

const ACTIVE_BG_CLASSES: Record<StatColor, string> = {
  default: "bg-muted/50",
  primary: "bg-primary/5",
  success: "bg-success/5",
  warning: "bg-warning/5",
  destructive: "bg-destructive/5",
};

/**
 * Consolidates v4's MetricCard + StatCard + MetaCard into one component. `compact`
 * subsumes MetaCard's centered icon+label+value case. Unlike v4's MetricCard, `icon`
 * is actually rendered here (v4 declared but never rendered it).
 */
export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  color = "default",
  loading,
  onClick,
  active,
  valueFormatter,
  compact,
  className,
}: StatCardProps) {
  const displayValue = loading ? null : (valueFormatter?.(value) ?? String(value));
  const clickable = Boolean(onClick);

  return (
    <Card
      role={clickable ? "button" : undefined}
      // A card that is also a filter says whether it is the one on.
      aria-pressed={clickable && active !== undefined ? active : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (clickable && (e.key === "Enter" || e.key === " ")) onClick?.();
      }}
      className={cn(
        "group",
        active && ACTIVE_BG_CLASSES[color],
        clickable && "cursor-pointer",
        className,
      )}
    >
      <CardContent
        className={cn("flex items-start justify-between gap-3", compact ? "p-3" : "p-4")}
      >
        <div className={cn("min-w-0", compact ? "space-y-1" : "space-y-1.5")}>
          <div className="flex items-center gap-1.5">
            {Icon && <Icon className="h-3 w-3 shrink-0 text-muted-foreground" />}
            <p
              className={cn(
                "truncate font-semibold uppercase tracking-wider text-muted-foreground",
                compact ? "text-[10px]" : "text-[11px]",
              )}
            >
              {title}
            </p>
          </div>
          {loading ? (
            <Skeleton className={cn("h-7", compact ? "w-12" : "w-20")} />
          ) : (
            <p
              className={cn(
                "font-bold leading-none tabular-nums",
                compact ? "text-lg" : "text-[26px]",
                VALUE_COLOR_CLASSES[color],
              )}
            >
              {displayValue}
            </p>
          )}
          {description &&
            (loading ? (
              <Skeleton className={cn("h-4", compact ? "w-20" : "w-32")} />
            ) : (
              <p
                className={cn(
                  "text-muted-foreground",
                  compact ? "truncate text-[10px]" : "text-xs",
                )}
              >
                {description}
              </p>
            ))}
        </div>
        {clickable && (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        )}
      </CardContent>
    </Card>
  );
}
