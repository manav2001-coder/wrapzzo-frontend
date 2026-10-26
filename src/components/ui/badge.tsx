import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// shadcn/ui — Badge.
const badgeVariants = cva(
  "inline-flex items-center whitespace-nowrap rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-1 focus:ring-ring",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        success: "border-transparent bg-success text-success-foreground hover:bg-success/80",
        warning: "border-transparent bg-warning text-warning-foreground hover:bg-warning/80",
        /**
         * Soft-tint pills — a tinted background + matching text/border at low opacity,
         * rather than a solid saturated fill. Matches `customer_support/frontend/src/
         * components/RiskBadge.tsx`'s `RISK_BG` treatment (`bg-emerald-50 text-emerald-700
         * border-emerald-200`, not a solid `bg-emerald-600`) — the reference this app
         * restyled itself against. Use these for a status/severity indicator that sits
         * among body text; the solid variants above stay for a badge that needs to read as
         * a clear call-to-action or a strong standalone label.
         */
        "destructive-soft":
          "border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/15",
        "warning-soft": "border-warning/20 bg-warning/10 text-warning hover:bg-warning/15",
        "success-soft": "border-success/20 bg-success/10 text-success hover:bg-success/15",
        "primary-soft": "border-primary/20 bg-primary/10 text-primary hover:bg-primary/15",
        "secondary-soft": "border-border bg-muted text-muted-foreground hover:bg-muted/80",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
