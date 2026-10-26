import * as React from "react";

import { cn } from "@/lib/utils";

export interface ProgressProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "role"> {
  /** 0-100. Ignored when `indeterminate`. */
  value?: number;
  /** Show a sweeping bar because the total size is unknown. */
  indeterminate?: boolean;
  label?: string;
}

/**
 * A progress bar. Hand-built rather than `bunx shadcn@latest add progress`: Radix's
 * Progress is determinate-only, so the indeterminate variant — which the FileManager needs
 * whenever the browser reports a non-`lengthComputable` upload — would have to be built on
 * top anyway. Same precedent as `fields/stepper.tsx`.
 */
export function Progress({ value = 0, indeterminate, label, className, ...props }: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      // An indeterminate bar deliberately reports no value — assistive tech should say
      // "busy", not a number we made up.
      aria-valuenow={indeterminate ? undefined : clamped}
      aria-valuemin={indeterminate ? undefined : 0}
      aria-valuemax={indeterminate ? undefined : 100}
      className={cn("relative h-1.5 w-full overflow-hidden rounded-full bg-primary/20", className)}
      {...props}
    >
      <div
        className={cn(
          "h-full rounded-full bg-primary",
          indeterminate ? "w-1/3 animate-loading-bar" : "transition-[width] duration-200",
        )}
        style={indeterminate ? undefined : { width: `${clamped}%` }}
      />
    </div>
  );
}
