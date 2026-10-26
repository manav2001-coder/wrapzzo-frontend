import { format } from "date-fns";

import { fromDateOnly } from "@/lib/datetime";

/**
 * A `YYYY-MM-DD` pair as one short label for a trigger button.
 *
 * The year is dropped from the left side when both ends share it ("01 Jan – 31 Jan 2026"),
 * because this has to fit inside a table header cell. An open-ended range is legal — the
 * server degrades a one-sided `between` to `gte`/`lte` — so both half-open forms render.
 *
 * Parsing goes through `fromDateOnly`, which reads the string's parts rather than
 * constructing a `Date` from it: `new Date("2026-01-15")` is UTC midnight and renders as the
 * 14th anywhere west of Greenwich.
 */
export function formatDateRangeLabel(
  from: string | null | undefined,
  to: string | null | undefined,
): string | null {
  const start = fromDateOnly(from);
  const end = fromDateOnly(to);
  if (!start && !end) return null;
  if (start && !end) return `${format(start, "dd MMM yyyy")} –`;
  if (!start && end) return `– ${format(end, "dd MMM yyyy")}`;
  if (!start || !end) return null;

  const sameYear = start.getFullYear() === end.getFullYear();
  const left = format(start, sameYear ? "dd MMM" : "dd MMM yyyy");
  return `${left} – ${format(end, "dd MMM yyyy")}`;
}
