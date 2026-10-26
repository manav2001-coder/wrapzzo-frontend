"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// shadcn/ui — Label.
const labelVariants = cva(
  // `leading-tight`, NOT `leading-none`. Every master form is a 2-column grid inside a
  // `sm:max-w-xl` drawer, so a label of any length wraps — and at `leading-none` a 14px line
  // box holds 14px text, so the two lines' ascenders and descenders collide and visibly clip.
  //
  // `font-semibold`: every form label is strong, decided once here rather than field by field.
  "text-sm font-semibold leading-tight peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
);

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn(labelVariants(), className)} {...props} />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
