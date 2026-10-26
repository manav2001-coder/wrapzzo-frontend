import * as React from "react";
import type { DateRange } from "react-day-picker";
import { CalendarIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import { fromDateOnly, toDateOnly } from "@/lib/datetime";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { DATE_RANGE_PRESETS } from "@/components/fields/date-range-presets";
import { formatDateRangeLabel } from "@/components/fields/format-date-range";

/** A `[from, to]` pair of `YYYY-MM-DD` strings — either end may be open. */
export type DateRangeValue = [string | null, string | null];

export interface DateRangePickerProps {
  value?: DateRangeValue;
  /** `undefined` means the range was cleared. */
  onChange: (value: DateRangeValue | undefined) => void;
  disabled?: boolean;
  placeholder?: string;
  size?: "sm" | "default";
  align?: "start" | "center" | "end";
  className?: string;
  id?: string;
  "aria-invalid"?: boolean | "true" | "false";
  "aria-describedby"?: string;
}

const isEmpty = (value: DateRangeValue | undefined) => !value?.[0] && !value?.[1];

/**
 * One trigger, two months, and a rail of quick ranges.
 *
 * Replaces the two bare `<input type="date">` boxes the column filter used to render. Two
 * native date inputs do not fit a table header cell, cannot express "last 7 days", and style
 * differently in every browser — so a date filter looked broken next to every other control.
 *
 * Notes that are load-bearing rather than stylistic:
 *
 * - **Values are `YYYY-MM-DD` strings, converted with `toDateOnly`/`fromDateOnly`.** Never
 *   `toISOString().slice(0,10)`, which stores the previous day west of Greenwich, and never a
 *   `Date` round-trip, which UTC-parses and shifts. This is the same rule `lib/datetime.ts`
 *   documents and v4 gets wrong in its forms.
 * - **A hand-picked range commits on Apply, a preset commits immediately.** Picking a range
 *   takes two clicks, so committing on the first would fire a half-range fetch and a wasted
 *   request; a preset is already a complete range, so making the user confirm it is friction.
 * - `ui/calendar.tsx` already styles range mode (`range_start` / `range_middle` / `range_end`),
 *   so this needs no styling of its own and no new dependency.
 */
export function DateRangePicker({
  value,
  onChange,
  disabled,
  placeholder,
  size = "default",
  align = "start",
  className,
  id,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: DateRangePickerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);

  const selected = React.useMemo<DateRange | undefined>(() => {
    const from = fromDateOnly(value?.[0]);
    const to = fromDateOnly(value?.[1]);
    if (!from && !to) return undefined;
    return { from: from ?? to, to: to ?? undefined };
  }, [value]);

  const [pending, setPending] = React.useState<DateRange | undefined>(selected);

  // Re-seed from the committed value each time the popover opens, so an abandoned edit does
  // not survive as a stale pending range the next time round.
  React.useEffect(() => {
    if (open) setPending(selected);
  }, [open, selected]);

  const commit = (range: DateRange | undefined) => {
    const from = toDateOnly(range?.from ?? null);
    const to = toDateOnly(range?.to ?? null);
    onChange(from || to ? [from, to] : undefined);
    setOpen(false);
  };

  const label = formatDateRangeLabel(value?.[0], value?.[1]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          id={id}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
          className={cn(
            "w-full min-w-0 justify-start text-left font-normal",
            size === "sm" && "h-8 px-2 text-xs",
            isEmpty(value) && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon
            className={cn("shrink-0", size === "sm" ? "mr-1.5 h-3.5 w-3.5" : "mr-2 h-4 w-4")}
          />
          {/* The button is `whitespace-nowrap`, so an untruncated label spills outside the
              border rather than wrapping — the defect the other pickers had. */}
          <span className="truncate">{label ?? placeholder ?? t("dateRange.placeholder")}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align={align} className="flex w-auto flex-col p-0 sm:flex-row">
        <div className="flex flex-col gap-1 p-2 sm:w-40">
          {DATE_RANGE_PRESETS.map((preset) => (
            <Button
              key={preset.key}
              type="button"
              variant="ghost"
              size="sm"
              className="justify-start font-normal"
              onClick={() => {
                const [from, to] = preset.range(new Date());
                commit({ from, to });
              }}
            >
              {t(`dateRange.presets.${preset.key}`)}
            </Button>
          ))}
        </div>
        <Separator className="sm:h-auto sm:w-px" orientation="horizontal" />
        <div className="flex flex-col">
          <Calendar
            mode="range"
            numberOfMonths={2}
            selected={pending}
            onSelect={setPending}
            // Open on the month the range is already in, not on today's. Without this,
            // re-opening a filter set to January lands on the current month and the
            // selection is off-screen, which reads as the range having been lost.
            defaultMonth={pending?.from ?? selected?.from}
            autoFocus
            className="p-2"
          />
          <div className="flex items-center justify-between gap-2 border-t p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setPending(undefined);
                commit(undefined);
              }}
            >
              {t("action.clear")}
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                {t("action.cancel")}
              </Button>
              <Button type="button" size="sm" onClick={() => commit(pending)}>
                {t("action.apply")}
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
