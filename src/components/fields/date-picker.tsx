import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { useUserTimezone } from "@/hooks/use-user-timezone";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface DatePickerProps {
  value: Date | null;
  onChange?: (value: Date | null) => void;
  /** ISO string in the resolved timezone (see useUserTimezone — currently browser-local). */
  onChangeUTC?: (isoString: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
  fromDate?: Date;
  toDate?: Date;
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

/** Popover + Calendar, with a sticky Clear/Cancel/Apply footer (matches v4's picker UX). */
export function DatePicker({
  value,
  onChange,
  onChangeUTC,
  disabled,
  placeholder = "Pick a date",
  fromDate,
  toDate,
  className,
  id,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: DatePickerProps) {
  useUserTimezone();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState<Date | undefined>(value ?? undefined);

  React.useEffect(() => {
    if (open) setPending(value ?? undefined);
  }, [open, value]);

  const commit = (date: Date | null) => {
    onChange?.(date);
    onChangeUTC?.(date ? date.toISOString() : null);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          id={id}
          aria-describedby={ariaDescribedBy}
          aria-invalid={ariaInvalid}
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full min-w-0 justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {/* `Button` is `whitespace-nowrap`, so an untruncated value spills outside the
              border instead of clipping — "August 27th, 2026 at 3:45 PM" in a half-width
              drawer column is guaranteed to. */}
          <span className="truncate">{value ? format(value, "PPP") : placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="flex w-auto flex-col p-0">
        <Calendar
          mode="single"
          // Bound the month/year dropdowns to the field's OWN allowed range, so a date of
          // birth (`toDate` = today) offers no future years at all rather than 30 of them.
          // Unset falls back to the Calendar's wide default.
          startMonth={fromDate}
          endMonth={toDate}
          selected={pending}
          onSelect={setPending}
          disabled={
            fromDate && toDate
              ? { before: fromDate, after: toDate }
              : fromDate
                ? { before: fromDate }
                : toDate
                  ? { after: toDate }
                  : undefined
          }
          className="max-h-80 overflow-y-auto"
        />
        <div className="flex items-center justify-between gap-2 border-t p-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => commit(null)}>
            Clear
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={() => commit(pending ?? null)}>
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
