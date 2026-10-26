import * as React from "react";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const SIZE_CLASSES = { sm: "h-10 w-10", default: "h-12 w-12", lg: "h-14 w-14" } as const;
const EXTENDED_SIZE_CLASSES = { sm: "h-10 px-4", default: "h-12 px-5", lg: "h-14 px-6" } as const;

const COLOR_VARIANT = {
  primary: "default",
  secondary: "secondary",
  destructive: "destructive",
} as const;

const POSITION_CLASSES = {
  "bottom-right": "fixed bottom-6 right-6 z-40",
  "bottom-left": "fixed bottom-6 left-6 z-40",
  none: "",
} as const;

/** A Lucide icon, or any component taking a `className` (the LogiClick robot is an image). */
type FabIcon = React.ComponentType<{ className?: string }>;

export interface FabProps extends Omit<ButtonProps, "size" | "variant" | "children"> {
  icon: FabIcon;
  /** Required — a FAB is icon-only, so it always needs an accessible name. */
  label: string;
  /** v4's `variant="extended"`: shows the label beside the icon. */
  extended?: boolean;
  size?: keyof typeof SIZE_CLASSES;
  color?: keyof typeof COLOR_VARIANT;
  /** `none` takes it out of the corner, for in-flow or showcase use. */
  position?: keyof typeof POSITION_CLASSES;
}

/**
 * A floating action button. `loading` is inherited from `Button`, so it needs no
 * reimplementation here.
 */
export const Fab = React.forwardRef<HTMLButtonElement, FabProps>(
  (
    {
      icon: Icon,
      label,
      extended = false,
      size = "default",
      color = "primary",
      position = "bottom-right",
      className,
      ...props
    },
    ref,
  ) => {
    const button = (
      <Button
        ref={ref}
        type="button"
        variant={COLOR_VARIANT[color]}
        aria-label={extended ? undefined : label}
        className={cn(
          "rounded-full shadow-lg",
          extended ? EXTENDED_SIZE_CLASSES[size] : SIZE_CLASSES[size],
          POSITION_CLASSES[position],
          className,
        )}
        {...props}
      >
        <Icon />
        {extended && label}
      </Button>
    );

    // An extended FAB shows its label, so a tooltip repeating it would be noise.
    if (extended) return button;

    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="left">{label}</TooltipContent>
      </Tooltip>
    );
  },
);
Fab.displayName = "Fab";
