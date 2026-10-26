import * as React from "react";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export interface RadioOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface RadioGroupFieldProps {
  value: string;
  onValueChange: (value: string) => void;
  options: RadioOption[];
  row?: boolean;
  label?: React.ReactNode;
  helperText?: React.ReactNode;
  error?: boolean;
  disabled?: boolean;
  name?: string;
  className?: string;
}

export function RadioGroupField({
  value,
  onValueChange,
  options,
  row,
  label,
  helperText,
  error,
  disabled,
  name,
  className,
}: RadioGroupFieldProps) {
  /**
   * Ids were `` `${name ?? "radio"}-${value}` ``, so two groups rendered without a `name` on
   * one page produced IDENTICAL ids — and a `<label for>` binds to the FIRST match in the
   * document, so clicking an option in the second group toggled the first group's. `name` is
   * optional and most callers omit it, so the collision was the default case.
   */
  const generatedId = React.useId();
  const idPrefix = name ?? generatedId;

  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label className={cn(error && "text-destructive")}>{label}</Label>}
      <RadioGroup
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        name={name}
        className={row ? "flex flex-row gap-4" : undefined}
      >
        {options.map((option) => (
          <div key={option.value} className="flex items-center gap-2">
            <RadioGroupItem
              value={option.value}
              id={`${idPrefix}-${option.value}`}
              disabled={option.disabled}
            />
            <Label htmlFor={`${idPrefix}-${option.value}`}>{option.label}</Label>
          </div>
        ))}
      </RadioGroup>
      {helperText && (
        <p className={cn("text-xs", error ? "text-destructive" : "text-muted-foreground")}>
          {helperText}
        </p>
      )}
    </div>
  );
}
