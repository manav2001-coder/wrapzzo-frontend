import * as React from "react";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input, inputVariants } from "@/components/ui/input";

interface DebouncedInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "value" | "size"
> {
  value: string | number;
  onFilterChange: (value: string | number) => void;
  debounce?: number;
  /** Bump to force-reset to `value` and immediately fire onFilterChange, bypassing debounce. */
  resetKey?: number;
  /**
   * The magnifying glass. On by default because most of these ARE searches — but a
   * min/max range is not, and a magnifier inside a box labelled "Min" reads as a bug.
   */
  showIcon?: boolean;
  size?: "sm" | "default";
  /** Reserve the rendered placeholder width, including padding and the search icon. */
  fitPlaceholder?: boolean;
}

export function DebouncedInput({
  value: initialValue,
  onFilterChange,
  debounce = 500,
  resetKey,
  showIcon = true,
  size = "sm",
  fitPlaceholder = false,
  className,
  ...props
}: DebouncedInputProps) {
  const [value, setValue] = React.useState(initialValue);

  // Kept in refs so the debounce effect can depend on `value` ALONE. Depending on the
  // callback would restart the timer on every parent render, and a table re-renders on
  // every keystroke — the filter would then never settle and never fire.
  const onFilterChangeRef = React.useRef(onFilterChange);
  onFilterChangeRef.current = onFilterChange;

  /**
   * The last value this input pushed upstream.
   *
   * The parent echoes it straight back as `initialValue` (it becomes the column's filter
   * value), and that echo must not clobber whatever the user has typed since. Ported from
   * v4's `DebouncedInput`, which is the one part of its filter stack worth copying verbatim.
   */
  const lastEmitted = React.useRef<string | number | undefined>(undefined);
  const prevResetKey = React.useRef(resetKey);
  const mounted = React.useRef(false);

  React.useEffect(() => {
    if (initialValue === lastEmitted.current) return;
    setValue(initialValue);
  }, [initialValue]);

  // "Clear filters" flushes immediately: waiting out the debounce would leave the cleared
  // box showing empty while the table still displayed filtered rows.
  React.useEffect(() => {
    if (resetKey === undefined || resetKey === prevResetKey.current) return;
    prevResetKey.current = resetKey;
    setValue(initialValue);
    lastEmitted.current = initialValue;
    onFilterChangeRef.current(initialValue);
  }, [resetKey, initialValue]);

  React.useEffect(() => {
    // Not on mount. The effect runs on first render too, so without this every filter input
    // scheduled a spurious change one debounce after appearing — N wasted refetches per
    // table, and a `columnFilters` update that reset the page the user was already on.
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const timeout = setTimeout(() => {
      lastEmitted.current = value;
      onFilterChangeRef.current(value);
    }, debounce);
    return () => clearTimeout(timeout);
  }, [value, debounce]);

  return (
    <div className={cn("relative", fitPlaceholder && "min-w-max flex-1")}>
      {fitPlaceholder && (
        // Use the control's font and padding so translations and font changes size naturally.
        <span
          aria-hidden="true"
          className={cn(
            inputVariants({ size }),
            "invisible block w-max whitespace-pre",
            showIcon && (size === "sm" ? "pl-7" : "pl-8"),
            className,
          )}
        >
          {props.placeholder || "\u00a0"}
        </span>
      )}
      {showIcon && (
        <Search
          aria-hidden
          className={cn(
            "pointer-events-none absolute top-1/2 z-10 -translate-y-1/2 text-muted-foreground",
            size === "sm" ? "left-2 h-3.5 w-3.5" : "left-2.5 h-4 w-4",
          )}
        />
      )}
      <Input
        {...props}
        size={size}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={cn(
          showIcon && (size === "sm" ? "pl-7" : "pl-8"),
          fitPlaceholder && "absolute inset-0",
          className,
        )}
      />
    </div>
  );
}
