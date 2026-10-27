/**
 * A user's own table layout (hidden columns, order, widths), kept in this browser.
 *
 * MobixFL also syncs this to the server so a layout follows the user to another machine; Wrappzo
 * has no such endpoint, so the browser copy is the only one. It is read synchronously, so a table
 * renders in its saved layout on the first paint.
 */
export interface ColumnConfigState {
  visibility: Record<string, boolean>
  /** The user's own order, or `[]` while they have not reordered (the screen's order applies). */
  order: string[]
  /** Column id → width in px, only for columns the user has resized. */
  sizing: Record<string, number>
}

export const EMPTY_CONFIG: ColumnConfigState = { visibility: {}, order: [], sizing: {} }

const KEY_PREFIX = 'wrapzzo.table-column-config.'

/** Per USER: a browser is shared between people, and one person's widths are not the next one's. */
function keyFor(userId: string | undefined, namespace: string): string {
  return userId ? `${KEY_PREFIX}${userId}.${namespace}` : `${KEY_PREFIX}${namespace}`
}

export function loadConfig(userId: string | undefined, namespace: string): ColumnConfigState | null {
  try {
    const raw = localStorage.getItem(keyFor(userId, namespace))
    return raw ? { ...EMPTY_CONFIG, ...(JSON.parse(raw) as Partial<ColumnConfigState>) } : null
  } catch {
    return null
  }
}

export function saveConfig(userId: string | undefined, namespace: string, state: ColumnConfigState): ColumnConfigState {
  try {
    localStorage.setItem(keyFor(userId, namespace), JSON.stringify(state))
  } catch {
    // Blocked or full storage: the layout still works for this session, it just isn't remembered.
  }
  return state
}

export function clearConfig(userId: string | undefined, namespace: string) {
  try {
    localStorage.removeItem(keyFor(userId, namespace))
  } catch {
    // Nothing to clear where storage is unavailable.
  }
}

/** Kept for `useTableColumnConfig`'s shape: with no server copy, nothing ever arrives late. */
export function subscribeConfigChanges(_listener: (namespace: string) => void): () => void {
  return () => {}
}
