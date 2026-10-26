import * as React from "react";

import { cn } from "@/lib/utils";

export interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
  /** Accessible name for the group wrapper. */
  label?: string;
}

/**
 * Joins adjacent buttons into one segmented control of ACTIONS.
 *
 * Deliberately has no `size`/`variant` props: applying them to children would need
 * `React.Children.map` + `cloneElement`, which breaks `asChild`/`<Link>` children and
 * silently drops anything that isn't a Button. Callers set those on the buttons directly,
 * and the joining is pure CSS.
 *
 * For a single/multi-SELECT segmented control, use `fields/segmented-toggle.tsx` or
 * `fields/toggle-group-field.tsx` instead — those own a value; this one does not.
 */
export const ButtonGroup = React.forwardRef<HTMLDivElement, ButtonGroupProps>(
  ({ orientation = "horizontal", label, className, ...props }, ref) => (
    <div
      ref={ref}
      role="group"
      aria-label={label}
      aria-orientation={orientation}
      className={cn(
        "inline-flex",
        orientation === "horizontal"
          ? "flex-row [&>*:not(:first-child)]:-ml-px [&>*:not(:first-child)]:rounded-l-none [&>*:not(:last-child)]:rounded-r-none"
          : "flex-col [&>*:not(:first-child)]:-mt-px [&>*:not(:first-child)]:rounded-t-none [&>*:not(:last-child)]:rounded-b-none",
        // Keep the focused/hovered button's ring above its neighbours' borders.
        "[&>*:focus-visible]:relative [&>*:focus-visible]:z-10 [&>*:hover]:relative [&>*:hover]:z-10",
        className,
      )}
      {...props}
    />
  ),
);
ButtonGroup.displayName = "ButtonGroup";
