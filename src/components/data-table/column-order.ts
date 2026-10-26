/**
 * A user's saved column order laid over the columns the table has NOW.
 *
 * Ids the table no longer has are dropped, and columns the saved order never saw (an admin
 * added one in Field Config, a release shipped one) are appended in the table's own order — so a
 * saved layout can neither hide a new column nor resurrect a removed one. An empty save is "no
 * choice made": the table's order, which is the franchise's Field Config order.
 */
export function reconcileOrder(saved: readonly string[], columnIds: readonly string[]): string[] {
  const known = new Set(columnIds);
  const kept = saved.filter((id, index) => known.has(id) && saved.indexOf(id) === index);
  const seen = new Set(kept);
  return [...kept, ...columnIds.filter((id) => !seen.has(id))];
}

/** `order` with `activeId` moved to where `overId` sits; unchanged if either is unknown. */
export function moveColumn(order: readonly string[], activeId: string, overId: string): string[] {
  const from = order.indexOf(activeId);
  const to = order.indexOf(overId);
  if (from < 0 || to < 0 || from === to) return [...order];
  const next = [...order];
  next.splice(from, 1);
  next.splice(to, 0, activeId);
  return next;
}

/** What to call a column to a person: its header when that is plain text, else its id. */
export function columnTitle(column: { id: string; columnDef: { header?: unknown } }): string {
  return typeof column.columnDef.header === "string" ? column.columnDef.header : column.id;
}
