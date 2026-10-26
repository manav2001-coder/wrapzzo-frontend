import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const TONE_CLASSES = {
  default: "",
  primary: "text-primary hover:bg-primary/10 hover:text-primary",
  success: "text-success hover:bg-success/10 hover:text-success",
  warning: "text-warning hover:bg-warning/10 hover:text-warning",
  destructive: "text-destructive hover:bg-destructive/10 hover:text-destructive",
} as const;

const SIZE_CLASSES = {
  sm: "h-8 w-8",
  default: "h-9 w-9",
  lg: "h-10 w-10",
} as const;

export interface IconButtonProps extends Omit<ButtonProps, "size" | "children" | "aria-label"> {
  icon: LucideIcon;
  /** Accessible name. Doubles as the tooltip text unless `tooltip` is a string. */
  label: string;
  /** `false` for aria-label only, or a string to override the tooltip text. */
  tooltip?: boolean | string;
  tooltipSide?: "top" | "right" | "bottom" | "left";
  size?: keyof typeof SIZE_CLASSES;
  /** v4's `variant="light"`: tinted text with a matching translucent hover. */
  tone?: keyof typeof TONE_CLASSES;
}

/**
 * An icon-only button that is always labelled.
 *
 * Promotes one third of v4's `@extended/IconButton` — the icon + tooltip + `aria-label`
 * triple that the sidebar rail, `Fab`, `AppDialog` and `AccountMenu` each repeated. v4's
 * full `variant × color × shape` matrix stays a showcase recipe: `Button`'s own variants
 * already cover it, and re-encoding them here would be a second, competing vocabulary.
 *
 * Requires a `TooltipProvider` ancestor (mounted in `components/providers.tsx`).
 */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon: Icon,
      label,
      tooltip = true,
      tooltipSide = "bottom",
      size = "default",
      tone = "default",
      variant = "ghost",
      className,
      ...props
    },
    ref,
  ) => {
    const button = (
      <Button
        ref={ref}
        type="button"
        variant={variant}
        size="icon"
        aria-label={label}
        className={cn(SIZE_CLASSES[size], TONE_CLASSES[tone], className)}
        {...props}
      >
        <Icon />
      </Button>
    );

    if (!tooltip) return button;

    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side={tooltipSide}>
          {typeof tooltip === "string" ? tooltip : label}
        </TooltipContent>
      </Tooltip>
    );
  },
);
IconButton.displayName = "IconButton";
