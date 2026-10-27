/**
 * What a list column holds, which decides its header filter control and whether it sorts
 * (`components/data-table/list-field-policy.ts`). MobixFL publishes these per entity from its API
 * (`LIST_FIELDS`); Wrappzo's lists load whole and are filtered in the browser, so a screen passes
 * its own map to `DataTable`'s `listFields`, or none and lets each column declare itself.
 */
export type ListFieldKind = 'text' | 'number' | 'boolean' | 'date' | 'enum' | 'id'

export type ListFieldMap = Record<string, ListFieldKind>

/** Narrowest and widest a user can drag any column. */
export const TABLE_PREFERENCE_MIN_WIDTH = 60
export const TABLE_PREFERENCE_MAX_WIDTH = 800
