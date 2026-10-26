import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * shadcn/ui — Input, plus two additions this repo needs.
 *
 * **`size`** exists because the compact scale was previously undeclared: `h-9` is the base,
 * but the data-table area wanted `h-8 text-xs` and got there with ad-hoc `className`
 * overrides at ~20 call sites — one of which gave up and hand-rolled a raw `<input>` with its
 * own border classes, a fourth input style. A variant makes the two heights the only two.
 *
 * **`aria-invalid:` styling** exists because an invalid control never turned red. `FormControl`
 * injects `aria-invalid={!!error}` through a Radix `Slot` and `FormLabel` goes
 * `text-destructive`, but the input itself had no rule for it — so a failed field showed a red
 * label and a red message around a neutral box. Styling the attribute rather than a prop means
 * every field that forwards what `FormControl` injects is covered with no per-screen change.
 *
 * It must be spelled `aria-[invalid=true]:`, not `aria-invalid:`. Tailwind 3's default `aria`
 * variants are busy/checked/disabled/expanded/hidden/pressed/readonly/required/selected —
 * `invalid` is NOT among them, so the short form compiles to nothing at all and the box stays
 * neutral while the class name sits in the DOM looking correct.
 */
const inputVariants = cva(
  "flex w-full rounded-md border border-input bg-background shadow-sm transition-colors file:border-0 file:bg-transparent file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive",
  {
    variants: {
      size: {
        default: "h-9 px-3 py-1 text-sm file:text-sm",
        sm: "h-8 px-2 py-1 text-xs file:text-xs",
      },
    },
    defaultVariants: { size: "default" },
  },
);

export interface InputProps
  // The native `size` attribute is a character count; this one is a height scale.
  extends
    Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, size, ...props }, ref) => {
    return (
      <input type={type} className={cn(inputVariants({ size }), className)} ref={ref} {...props} />
    );
  },
);
Input.displayName = "Input";

export { Input, inputVariants };
