import * as React from "react";
import { Link } from "react-router-dom";
import { Inbox, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  /** Renders the action as a router Link instead of a button. */
  to?: string;
  icon?: LucideIcon;
}

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  /** `card` draws a dashed panel; `plain` is bare, for use inside a SectionCard. */
  variant?: "card" | "plain";
  size?: "sm" | "default";
  className?: string;
  children?: React.ReactNode;
}

/**
 * The "nothing here yet" panel for a page or a card.
 *
 * Net-new — v4 had no equivalent; its empty states were ad-hoc per feature (and
 * `EmptyTable`, which is table-specific and lives in `data-table/`).
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  secondaryAction,
  variant = "card",
  size = "default",
  className,
  children,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        size === "sm" ? "gap-2 py-6" : "gap-3 py-12",
        variant === "card" && "rounded-lg border-2 border-dashed border-border",
        className,
      )}
    >
      <Icon
        className={cn("text-muted-foreground opacity-50", size === "sm" ? "h-6 w-6" : "h-10 w-10")}
      />
      <h3 className={cn("font-medium", size === "sm" ? "text-sm" : "text-base")}>{title}</h3>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {children}
      {(action || secondaryAction) && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {action && <ActionButton action={action} />}
          {secondaryAction && <ActionButton action={secondaryAction} variant="outline" />}
        </div>
      )}
    </div>
  );
}

function ActionButton({
  action,
  variant = "default",
}: {
  action: EmptyStateAction;
  variant?: "default" | "outline";
}) {
  const Icon = action.icon;
  const content = (
    <>
      {Icon && <Icon className="h-4 w-4" />}
      {action.label}
    </>
  );

  if (action.to) {
    return (
      <Button asChild size="sm" variant={variant}>
        <Link to={action.to}>{content}</Link>
      </Button>
    );
  }
  return (
    <Button type="button" size="sm" variant={variant} onClick={action.onClick}>
      {content}
    </Button>
  );
}
