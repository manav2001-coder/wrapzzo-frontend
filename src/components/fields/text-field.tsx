import * as React from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export interface TextFieldProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "size" | "type"
> {
  type?: React.HTMLInputTypeAttribute;
  multiline?: boolean;
  rows?: number;
  loading?: boolean;
  startAdornment?: React.ReactNode;
  endAdornment?: React.ReactNode;
  fullWidth?: boolean;
  size?: "sm" | "default";
  error?: boolean;
  wrapperClassName?: string;
}

/**
 * Plain controlled text input — used inside a react-hook-form FormField render-prop
 * exactly like the raw ui/input.tsx is in Login.tsx, plus adornment slots and a
 * loading spinner (which takes priority over a custom endAdornment).
 */
export const TextField = React.forwardRef<HTMLInputElement | HTMLTextAreaElement, TextFieldProps>(
  (
    {
      type,
      multiline,
      rows,
      loading,
      startAdornment,
      endAdornment,
      fullWidth = true,
      size = "default",
      error,
      className,
      wrapperClassName,
      ...props
    },
    ref,
  ) => {
    const trailing = loading ? (
      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
    ) : (
      endAdornment
    );

    if (multiline) {
      return (
        <div className={cn("relative", fullWidth && "w-full", wrapperClassName)}>
          {startAdornment && (
            <span className="pointer-events-none absolute left-3 top-3 text-muted-foreground">
              {startAdornment}
            </span>
          )}
          <Textarea
            ref={ref as React.Ref<HTMLTextAreaElement>}
            rows={rows}
            disabled={loading || props.disabled}
            aria-invalid={error}
            className={cn(
              startAdornment && "pl-9",
              trailing && "pr-9",
              size === "sm" && "text-xs",
              error && "border-destructive focus-visible:ring-destructive",
              className,
            )}
            {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
          />
          {/* `trailing` and `startAdornment` were computed above and then never rendered in
              this branch, so `loading` gave a disabled textarea with NO spinner and an
              `endAdornment` vanished without a trace. Anchored to the top rather than
              vertically centred, since a textarea grows downwards. */}
          {trailing && <span className="absolute right-3 top-3">{trailing}</span>}
        </div>
      );
    }

    return (
      <div className={cn("relative", fullWidth && "w-full", wrapperClassName)}>
        {startAdornment && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {startAdornment}
          </span>
        )}
        <Input
          ref={ref as React.Ref<HTMLInputElement>}
          type={type}
          disabled={loading || props.disabled}
          aria-invalid={error}
          className={cn(
            startAdornment && "pl-9",
            trailing && "pr-9",
            size === "sm" && "h-8 text-xs",
            error && "border-destructive focus-visible:ring-destructive",
            className,
          )}
          {...props}
        />
        {trailing && <span className="absolute right-3 top-1/2 -translate-y-1/2">{trailing}</span>}
      </div>
    );
  },
);
TextField.displayName = "TextField";
