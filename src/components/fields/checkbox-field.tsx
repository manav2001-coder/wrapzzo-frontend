import * as React from "react";

import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export interface CheckboxFieldProps {
  checked?: boolean | "indeterminate";
  onCheckedChange?: (checked: boolean) => void;
  label?: React.ReactNode;
  helperText?: React.ReactNode;
  error?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function CheckboxField({
  checked,
  onCheckedChange,
  label,
  helperText,
  error,
  disabled,
  id,
  className,
}: CheckboxFieldProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center gap-2">
        <Checkbox
          id={inputId}
          checked={checked}
          onCheckedChange={(state) => onCheckedChange?.(state === true)}
          disabled={disabled}
          aria-invalid={error}
          className={cn(error && "border-destructive")}
        />
        {label && (
          <Label htmlFor={inputId} className={cn(disabled && "text-muted-foreground")}>
            {label}
          </Label>
        )}
      </div>
      {helperText && (
        <p className={cn("text-xs", error ? "text-destructive" : "text-muted-foreground")}>
          {helperText}
        </p>
      )}
    </div>
  );
}
