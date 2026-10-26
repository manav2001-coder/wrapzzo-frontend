import type { FilterVariant, TableFilterField } from "@/components/data-table/types";

/**
 * A panel field's declared type mapped to the filter variant that picks its SQL operator.
 *
 * This is the fix for the single largest piece of duplication in v4's table stack. There,
 * every panel filter is emitted as `filterType: "equals"` unconditionally
 * (`CustomTable.tsx:840`), so any table wanting a date range has to declare two phantom
 * `_from`/`_to` panel fields and hand-fold them into one `between` inside its own `fetchData`.
 * `DomesticOrderTable.tsx` and `PalletTransactionTable.tsx` both carry that code, and the
 * latter's comment calls it "the established pattern for this".
 *
 * Declaring the type once and mapping it here means a screen says `type: "dateRange"` and
 * stops. `masters-api.ts`'s `toFilter` already turns that variant into a `between` (degrading
 * to `gte`/`lte` for a one-sided range), so nothing new is needed downstream.
 *
 * `number` maps to `"text"` deliberately: `toFilter` checks the VALUE's shape before the
 * variant, so a numeric value becomes `equals` either way — and a panel number field is a
 * single value, not the min/max pair `"numberRange"` implies.
 */
const BY_TYPE: Record<TableFilterField["type"], FilterVariant> = {
  text: "text",
  number: "text",
  select: "select",
  multiselect: "multiselect",
  dateRange: "dateRange",
};

export function panelFilterVariant(type: TableFilterField["type"] | undefined): FilterVariant {
  return type ? BY_TYPE[type] : "text";
}

/** The backend field name for a panel field — same `filterField ?? id` rule as a column. */
export function panelFieldName(field: TableFilterField): string {
  return field.filterField ?? field.id;
}
