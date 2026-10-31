import type { ColumnDef } from '@tanstack/react-table'

/**
 * MobixFL's per-company column configuration (Field Config). Wrappzo has no such setting yet, so
 * every column is shown as declared; the hook keeps the same shape so screens ported from MobixFL
 * read the same.
 */
function applyToColumns<T>(columns: ColumnDef<T, unknown>[]): ColumnDef<T, unknown>[] {
  return columns
}

export function useFieldConfig(_namespace: string) {
  return { applyToColumns }
}
