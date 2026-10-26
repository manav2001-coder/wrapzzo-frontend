import type { ListFieldKind, ListFieldMap } from "@/lib/list-fields";

import type { FilterVariant } from "@/components/data-table/types";

/**
 * How a published list field becomes a table control.
 *
 * `LIST_FIELDS` says what the server can filter and sort by; this says what the user is
 * therefore offered. Keeping the policy here rather than inline in `DataTable` is what makes
 * it testable — the interesting cases are all "offer NOTHING", and a control that should not
 * exist is invisible in a rendered snapshot.
 *
 * Two rules carry the weight:
 *
 * - **`id` gets neither.** A uuid FK cannot usefully be sorted (ordering by a random uuid is
 *   noise) and a `contains` against one can only ever match nothing. The field stays in the
 *   allowlist because programmatic filters use it — the franchise scope narrows on
 *   `franchiseId`, Metadata narrows values on `categoryId` — but the user is offered no box.
 * - **`enum` and `boolean` render NO filter without options.** v4 falls through to a text
 *   input there (`Filter.tsx:299` — `filterVariant === 'select' && columnMeta?.filterOptions`),
 *   which puts a substring search on a constrained column and reads as broken. There is also
 *   no generic label pair to invent: `active` reads Active/Inactive and `isSeeded` reads
 *   Seeded/Manual, so the screen has to say.
 */
export function defaultFilterVariant(
  kind: ListFieldKind | undefined,
  hasOptions: boolean,
): FilterVariant | undefined {
  switch (kind) {
    case "text":
      return "text";
    case "number":
      return "numberRange";
    case "date":
      return "dateRange";
    case "boolean":
    case "enum":
      return hasOptions ? "select" : undefined;
    default:
      // `id`, and any field absent from the allowlist.
      return undefined;
  }
}

/** Sortable in the header — everything the server can order by except a uuid. */
export function isSortableKind(kind: ListFieldKind | undefined): boolean {
  return kind !== undefined && kind !== "id";
}

/**
 * The one place a column id becomes a server field name.
 *
 * `meta.filterField` wins, then the explicit `id`, then the id react-table derives from
 * `accessorKey`. The old code compared `column.id` only, so a column declared with
 * `accessorKey` and no `id` — every showcase column — silently resolved to no variant and
 * had its filter sent with the wrong operator.
 */
export function fieldNameOf(column: {
  id?: string;
  accessorKey?: unknown;
  meta?: { filterField?: string };
}): string | undefined {
  return column.meta?.filterField ?? columnIdOf(column);
}

/**
 * The id TanStack keys a column's state by — what `columnFilters` and `sorting` entries carry.
 * Distinct from `fieldNameOf`, which answers with the SERVER field and so differs from this
 * whenever `meta.filterField` is set. Looking a column up by one while holding the other is
 * the defect this function exists to prevent.
 */
export function columnIdOf(column: { id?: string; accessorKey?: unknown }): string | undefined {
  return column.id ?? (typeof column.accessorKey === "string" ? column.accessorKey : undefined);
}

/** The kind published for a column's field, or `undefined` when the field is not listed. */
export function kindOf(
  listFields: ListFieldMap | undefined,
  field: string | undefined,
): ListFieldKind | undefined {
  if (!listFields || !field) return undefined;
  return listFields[field];
}
