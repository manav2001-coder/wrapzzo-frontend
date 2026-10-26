import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export interface SegmentedToggleProps {
  value: boolean;
  onChange: (value: boolean) => void;
  label?: React.ReactNode;
  trueLabel?: string;
  falseLabel?: string;
  disabled?: boolean;
  required?: boolean;
  fullWidth?: boolean;
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

/**
 * Boolean Yes/No control built on the same ToggleGroup primitive as ToggleGroupField
 * with exactly 2 fixed items. Re-clicking the active segment is a no-op — Radix's
 * single-select ToggleGroup emits "" when deselecting, which we simply ignore (can't
 * clear a boolean to null).
 */
export function SegmentedToggle({
  value,
  onChange,
  label,
  trueLabel = "Yes",
  falseLabel = "No",
  disabled,
  required,
  fullWidth,
  className,
  id,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: SegmentedToggleProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label>
          {label}
          {required && <span className="text-destructive"> *</span>}
        </Label>
      )}
      <ToggleGroup
        type="single"
        id={id}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        value={value ? "yes" : "no"}
        onValueChange={(v) => {
          if (v === "yes") onChange(true);
          if (v === "no") onChange(false);
        }}
        disabled={disabled}
        className={cn(fullWidth && "w-full")}
      >
        <ToggleGroupItem value="no" className={cn(fullWidth && "flex-1")}>
          {falseLabel}
        </ToggleGroupItem>
        <ToggleGroupItem value="yes" className={cn(fullWidth && "flex-1")}>
          {trueLabel}
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
