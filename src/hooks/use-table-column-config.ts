import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { reconcileOrder } from "@/components/data-table/column-order";
import {
  EMPTY_CONFIG,
  clearConfig,
  loadConfig,
  saveConfig,
  subscribeConfigChanges,
  type ColumnConfigState,
} from "@/lib/table-preferences-store";

/**
 * A user's own layout for one table — hidden columns, column order and widths — laid over the
 * franchise's Field Config, which keeps deciding which columns exist and their default order.
 *
 * Read synchronously from the browser, so a table renders in its saved layout on the first paint
 * and never waits for the network. Changes are kept in the browser at once and sent to the server
 * in the background (`lib/table-preferences-store.ts`), which is how a layout follows the user to
 * another machine; the server's copy arrives later through `useTablePreferencesSync` and updates
 * this hook if it is newer.
 *
 * `userId` scopes the saved layout to the person (a browser is shared). No-op (all columns
 * visible, original order, nothing persisted) when `namespace` is undefined. `order` is saved only
 * once the user drags a header, so until then the franchise's order keeps applying.
 *
 * **`DataTable` owns this hook, not the popover.** It used to be called inside
 * `ColumnVisibilityPopover`, which meant the persisted state drove the CHECKBOXES and nothing
 * else: the table's `useReactTable` had no `columnVisibility` in its state, so after a reload
 * a column the user had hidden was visible again while its box read unchecked. `setVisibility`
 * exists for that — react-table hands back a whole `VisibilityState`, not one id at a time.
 */
export function useTableColumnConfig(
  namespace: string | undefined,
  columnIds: string[],
  userId?: string,
) {
  const read = useCallback(
    () => (namespace ? (loadConfig(userId, namespace) ?? EMPTY_CONFIG) : EMPTY_CONFIG),
    [namespace, userId],
  );
  const [state, setState] = useState<ColumnConfigState>(read);

  // A different table or user: show what is stored for it, adjusted DURING render (React's pattern
  // for state that follows a prop) so the old layout never paints for the new table.
  const scope = `${userId ?? ""}\u0000${namespace ?? ""}`;
  const [loadedScope, setLoadedScope] = useState(scope);
  if (loadedScope !== scope) {
    setLoadedScope(scope);
    setState(read());
  }

  // The server's copy landing after first paint: re-read, but only when it is this table's.
  useEffect(() => {
    if (!namespace) return;
    return subscribeConfigChanges((changed) => {
      if (changed === namespace) setState(read());
    });
  }, [namespace, read]);

  // The state a change builds on. Kept beside React's own so a second change in the same event
  // (before a re-render) still builds on the first, and so that `saveConfig`, which writes storage
  // and queues a network push, runs ONCE per change and not inside a state updater, which React
  // may call twice.
  const latest = useRef(state);
  latest.current = state;
  const update = useCallback(
    (patch: Partial<ColumnConfigState>) => {
      const next = { ...latest.current, ...patch };
      const saved = namespace ? saveConfig(userId, namespace, next) : next;
      latest.current = saved;
      setState(saved);
    },
    [namespace, userId],
  );

  /** Replace the whole map — what react-table's `onColumnVisibilityChange` produces. */
  const setVisibility = useCallback(
    (visibility: Record<string, boolean>) => update({ visibility }),
    [update],
  );

  /** Replace the whole width map — what react-table's `onColumnSizingChange` produces. */
  const setSizing = useCallback((sizing: Record<string, number>) => update({ sizing }), [update]);

  const setOrder = useCallback((order: string[]) => update({ order }), [update]);

  const reset = useCallback(() => {
    setState(EMPTY_CONFIG);
    if (namespace) clearConfig(userId, namespace);
  }, [namespace, userId]);

  // Saved order laid over the columns that exist now; the franchise's order when nothing is saved.
  const order = useMemo(() => reconcileOrder(state.order, columnIds), [state.order, columnIds]);

  return {
    visibility: state.visibility,
    order,
    sizing: state.sizing,
    setSizing,
    setVisibility,
    setOrder,
    reset,
  };
}
