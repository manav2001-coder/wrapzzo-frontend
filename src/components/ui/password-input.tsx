import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input, type InputProps } from "@/components/ui/input";

/**
 * A password `Input` with a show/hide toggle — the eye icon every password field in the
 * app was missing (Login, Set Password, Reset Password all rendered a plain
 * `type="password"`).
 *
 * The labels are PROPS, not translated here: this is a `ui/` primitive alongside `Input`
 * itself, and every other primitive in this kit takes its accessible name from the caller
 * (`IndeterminateCheckbox`'s `aria-label`, `DebouncedInput`'s icon) rather than importing
 * `useTranslation` — a shared component package must not decide which locale namespace a
 * caller's string lives in.
 *
 * The toggle stays a normal, focusable button (no `tabIndex={-1}`): a mouse-only affordance
 * would be a regression for anyone driving the form by keyboard.
 */
export interface PasswordInputProps extends Omit<InputProps, "type"> {
  /** Accessible name while the password is hidden (the toggle's current action). */
  showLabel: string;
  /** Accessible name while the password is visible. */
  hideLabel: string;
  /**
   * Override the toggle button's own classes — e.g. Login's dark hero panel, where the
   * default `text-muted-foreground` token renders too close to the background to see.
   */
  toggleClassName?: string;
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, showLabel, hideLabel, toggleClassName, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);

    return (
      <div className="relative">
        <Input
          {...props}
          ref={ref}
          type={visible ? "text" : "password"}
          className={cn("pr-9", className)}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2 rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            toggleClassName,
          )}
        >
          {/*
           * The accessible name comes from this TEXT, not an `aria-label` — every existing
           * password field test in the app queries `getByLabelText(/password/i)` for the
           * input itself, and Testing Library's `getByLabelText` also matches an
           * `aria-label` on any element. An `aria-label="Show password"` here would give
           * every one of those queries two matches (the input AND this button) and turn a
           * passing suite into a strict-mode violation the moment this component landed —
           * the same class of collision the column-filter/label notes elsewhere document.
           * `getByRole("button", { name })` still finds this via its text content.
           */}
          <span className="sr-only">{visible ? hideLabel : showLabel}</span>
          {visible ? (
            <EyeOff aria-hidden className="h-4 w-4" />
          ) : (
            <Eye aria-hidden className="h-4 w-4" />
          )}
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";
