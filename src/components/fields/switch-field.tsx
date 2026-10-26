import * as React from "react";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export interface SwitchFieldProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: React.ReactNode;
  helperText?: React.ReactNode;
  error?: boolean;
  disabled?: boolean;
  /**
   * `id` is injected by `FormControl` (along with the aria pair below), which clones its child
   * with them. They must land on the FOCUSABLE element, not on a wrapper `<div>`:
   * `FormLabel`'s `htmlFor` points at that id, and a `<div>` is not a labelable element — so
   * clicking the label focuses nothing. See the same note on `phone-field.tsx`.
   */
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  className?: string;
}

/**
 * Consolidates v4's CustomSwitch + CustomToggle (near-duplicate boolean switches that
 * existed only for historical reasons) into one plain-controlled component.
 */
export function SwitchField({
  checked,
  onCheckedChange,
  label,
  helperText,
  error,
  disabled,
  id,
  className,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: SwitchFieldProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center gap-2">
        <Switch
          id={inputId}
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          aria-describedby={ariaDescribedBy}
          aria-invalid={ariaInvalid}
        />
        {label && (
          <Label
            htmlFor={inputId}
            className={cn(disabled && "opacity-70", error && "text-destructive")}
          >
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
