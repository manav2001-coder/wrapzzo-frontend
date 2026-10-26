import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export interface ToggleOption {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
}

export interface ToggleGroupFieldProps {
  options: ToggleOption[];
  exclusive?: boolean;
  value: string | string[];
  onValueChange: (value: string | string[]) => void;
  fullWidth?: boolean;
  error?: boolean;
  helperText?: React.ReactNode;
  label?: React.ReactNode;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  /**
   * Injected by `FormControl`, which clones its child with `id`/`aria-describedby`/
   * `aria-invalid`. They must land on the FOCUSABLE element, not on a wrapper `<div>`:
   * `FormLabel`'s `htmlFor` points at that id, and a `<div>` is not a labelable element — so
   * clicking the label focused nothing and `getByLabelText` could not find the field. See the
   * same note on `phone-field.tsx`, the one field that already solved this.
   */
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}

export function ToggleGroupField({
  options,
  exclusive = true,
  value,
  onValueChange,
  fullWidth,
  error,
  helperText,
  label,
  required,
  disabled,
  className,
  id,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: ToggleGroupFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label className={cn(error && "text-destructive")}>
          {label}
          {required && <span className="text-destructive"> *</span>}
        </Label>
      )}
      {exclusive ? (
        <ToggleGroup
          type="single"
          value={value as string}
          onValueChange={(v) => v && onValueChange(v)}
          disabled={disabled}
          id={id}
          aria-describedby={ariaDescribedBy}
          aria-invalid={ariaInvalid}
          // The invalid state marks each ITEM, not the group: `ToggleGroup` is `gap-1`, so a
          // ring on the root drew a red outline around the gaps between the buttons.
          className={cn(fullWidth && "w-full", error && "[&>*]:border-destructive")}
        >
          {options.map((option) => (
            <ToggleGroupItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
              className={cn(fullWidth && "flex-1")}
            >
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      ) : (
        <ToggleGroup
          type="multiple"
          value={value as string[]}
          onValueChange={onValueChange}
          disabled={disabled}
          id={id}
          aria-describedby={ariaDescribedBy}
          aria-invalid={ariaInvalid}
          // See the note on the exclusive branch above.
          className={cn(fullWidth && "w-full", error && "[&>*]:border-destructive")}
        >
          {options.map((option) => (
            <ToggleGroupItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
              className={cn(fullWidth && "flex-1")}
            >
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      )}
      {helperText && (
        <p className={cn("text-xs", error ? "text-destructive" : "text-muted-foreground")}>
          {helperText}
        </p>
      )}
    </div>
  );
}
