/**
 * How often the screens on the two sides of the artwork loop re-check the server: the MR's orders
 * and the vendor's queue. Without it each side only sees the other's move after a manual reload.
 * TanStack Query pauses the polling while the tab is in the background.
 */
export const LIVE_REFRESH_MS = 15_000
