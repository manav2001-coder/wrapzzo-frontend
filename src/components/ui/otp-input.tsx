import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * A one-time-code field: one box per digit, behaving as one control.
 *
 * Typing advances, Backspace steps back, the arrows move, and a paste — or the whole code an SMS
 * autofill drops into the first box — is spread across the boxes. The value is a plain digit
 * string, so a form treats it like any other text field. `autoComplete="one-time-code"` is what
 * lets iOS and Android offer the code from the message.
 *
 * The group's accessible name comes from `aria-label`; each box is named "Digit n of N" through
 * `digitLabel`, a function prop for the same reason `PasswordInput` takes its labels as props: a
 * `ui/` primitive does not choose a locale namespace.
 */
export interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Fires once, when the last box is filled — typically to submit. */
  onComplete?: (value: string) => void;
  length?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  invalid?: boolean;
  "aria-label": string;
  digitLabel: (index: number, length: number) => string;
  /** Classes for each box — the dark sign-in panel overrides the default colours. */
  boxClassName?: string;
  className?: string;
}

export function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  disabled,
  autoFocus,
  invalid,
  "aria-label": ariaLabel,
  digitLabel,
  boxClassName,
  className,
}: OtpInputProps) {
  const refs = React.useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  const focusBox = (index: number) => {
    const box = refs.current[Math.min(Math.max(index, 0), length - 1)];
    box?.focus();
    box?.select();
  };

  const commit = (next: string) => {
    const clean = next.replace(/\D/g, "").slice(0, length);
    onChange(clean);
    if (clean.length === length && value.length !== length) onComplete?.(clean);
    return clean;
  };

  /** Write `typed` (one or many digits) starting at box `index`. */
  const fill = (index: number, typed: string) => {
    const incoming = typed.replace(/\D/g, "");
    if (!incoming) return;
    const clean = commit(value.slice(0, index) + incoming);
    focusBox(Math.min(index + incoming.length, clean.length, length - 1));
  };

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn("flex justify-between gap-2", className)}
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(node) => {
            refs.current[index] = node;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          autoFocus={autoFocus && index === 0}
          disabled={disabled}
          aria-label={digitLabel(index + 1, length)}
          aria-invalid={invalid || undefined}
          value={digit}
          onFocus={(event) => event.currentTarget.select()}
          onChange={(event) => {
            // A multi-character change is an autofill or a drag-drop, not typing.
            if (event.target.value === "") {
              commit(value.slice(0, index) + value.slice(index + 1));
              return;
            }
            fill(index, event.target.value.slice(-length));
          }}
          onPaste={(event) => {
            event.preventDefault();
            fill(index, event.clipboardData.getData("text"));
          }}
          onKeyDown={(event) => {
            if (event.key === "Backspace" && !digit) {
              event.preventDefault();
              commit(value.slice(0, Math.max(index - 1, 0)) + value.slice(index));
              focusBox(index - 1);
            } else if (event.key === "ArrowLeft") {
              event.preventDefault();
              focusBox(index - 1);
            } else if (event.key === "ArrowRight") {
              event.preventDefault();
              focusBox(index + 1);
            }
          }}
          className={cn(
            "h-11 w-full min-w-0 rounded-md border border-input bg-background text-center text-lg font-semibold tabular-nums",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
            "aria-[invalid=true]:border-destructive",
            boxClassName,
          )}
        />
      ))}
    </div>
  );
}
