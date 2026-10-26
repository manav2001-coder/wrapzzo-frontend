import { formatDateRangeLabel } from "@/components/fields/format-date-range";
import type { TableFilterField } from "@/components/data-table/types";

const isDateRangeValue = (value: unknown): value is [string | null, string | null] =>
  Array.isArray(value) &&
  value.length === 2 &&
  value.every((part) => part == null || typeof part === "string");

/**
 * What a collapsed filter chip reads for one active panel filter.
 *
 * Resolved from the field's `options` at render time, which is the whole reason the panel can
 * keep flat values. v4 cannot do this: it stores the selected OPTION OBJECT in form state, so
 * on apply it unwraps the value AND writes a parallel `<key>_label` entry purely so the chip
 * has a name to show — then has to filter every `_label` key back out before each request
 * (`CustomTable.tsx:788`). One lookup here replaces both halves of that.
 */
export function filterChipLabel(field: TableFilterField | undefined, value: unknown): string {
  if (field?.type === "dateRange" && isDateRangeValue(value)) {
    return formatDateRangeLabel(value[0], value[1]) ?? "";
  }

  const label = (entry: unknown) =>
    field?.options?.find((option) => String(option.value) === String(entry))?.label ??
    String(entry);

  if (Array.isArray(value)) return value.map(label).join(", ");
  return label(value);
}

/** A filter the user actually set — `""`, `undefined` and an empty list are all "unset". */
export function isActiveFilterValue(value: unknown): boolean {
  if (value === undefined || value === null || value === "") return false;
  if (Array.isArray(value))
    return value.some((part) => part !== undefined && part !== null && part !== "");
  return true;
}
