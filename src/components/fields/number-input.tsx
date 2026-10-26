import * as React from "react";
import { Minus, Plus } from "lucide-react";

import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface NumberInputProps {
  value?: number | null;
  defaultValue?: number | null;
  onChange?: (value: number | null) => void;
  onBlur?: () => void;
  min?: number;
  max?: number;
  step?: number;
  shiftMultiplier?: number;
  disabled?: boolean;
  error?: boolean;
  required?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  onlyPositiveValuesAllowed?: boolean;
  disableInputField?: boolean;
  name?: string;
  id?: string;
  fullWidth?: boolean;
  className?: string;
}

function clamp(value: number, min?: number, max?: number): number {
  let result = value;
  if (min !== undefined) result = Math.max(min, result);
  if (max !== undefined) result = Math.min(max, result);
  return result;
}

/** No MUI/Radix equivalent exists — hand-built stepper: Input flanked by two Buttons. */
export function NumberInput({
  value,
  defaultValue,
  onChange,
  onBlur,
  min,
  max,
  step = 1,
  shiftMultiplier = 10,
  disabled,
  error,
  required,
  readOnly,
  placeholder,
  onlyPositiveValuesAllowed,
  disableInputField,
  name,
  id,
  fullWidth = true,
  className,
}: NumberInputProps) {
  const { t } = useTranslation();
  const [internal, setInternal] = React.useState<number | null>(defaultValue ?? null);
  /**
   * What the user has TYPED, kept while it still means the current number. The text cannot be
   * derived from the number alone: "8." and "8" are the same number, so rendering `String(8)`
   * after every keystroke deleted the dot the user had just typed and the next digit made it
   * "85" — a field in hours could not be typed at all. Once the number moves away from what
   * the text says (a clamp, a stepper click, the form resetting) the number wins again.
   */
  const [draft, setDraft] = React.useState<string | null>(null);
  const isControlled = value !== undefined;
  const current = isControlled ? value : internal;
  const effectiveMin = onlyPositiveValuesAllowed ? Math.max(0, min ?? 0) : min;

  const commit = (next: number | null) => {
    setDraft(null);
    if (!isControlled) setInternal(next);
    onChange?.(next);
  };

  const step_ = (shiftHeld: boolean) => (shiftHeld ? step * shiftMultiplier : step);

  const increment = (shiftHeld: boolean) => {
    const base = current ?? 0;
    commit(clamp(base + step_(shiftHeld), effectiveMin, max));
  };

  const decrement = (shiftHeld: boolean) => {
    const base = current ?? 0;
    commit(clamp(base - step_(shiftHeld), effectiveMin, max));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (onlyPositiveValuesAllowed && e.key === "-") e.preventDefault();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (onlyPositiveValuesAllowed && e.clipboardData.getData("text").includes("-")) {
      e.preventDefault();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === "") {
      commit(null);
      return;
    }
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) return;
    const next = clamp(parsed, effectiveMin, max);
    commit(next);
    // Keep the typed text only when the number did not change under it (not clamped).
    if (next === parsed) setDraft(raw);
  };

  const shown = draft !== null && Number(draft) === current ? draft : (current ?? "");

  return (
    <div className={cn("flex items-center gap-1", fullWidth && "w-full", className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-9 w-9 shrink-0"
        disabled={disabled}
        onClick={(e) => decrement(e.shiftKey)}
        aria-label={t("action.decrement")}
      >
        <Minus className="h-3.5 w-3.5" />
      </Button>
      <Input
        id={id}
        name={name}
        // A fractional step is a decimal field ("8.5 hours"); the numeric keypad on a phone has no point.
        inputMode={Number.isInteger(step) ? "numeric" : "decimal"}
        className={cn("text-center", error && "border-destructive focus-visible:ring-destructive")}
        value={shown}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly || disableInputField}
        required={required}
        aria-invalid={error}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={onBlur}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-9 w-9 shrink-0"
        disabled={disabled}
        onClick={(e) => increment(e.shiftKey)}
        aria-label={t("action.increment")}
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
