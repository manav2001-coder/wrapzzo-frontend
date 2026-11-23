/**
 * How often the screens on the two sides of the artwork loop re-check the server: the MR's orders
 * and the vendor's queue. Without it each side only sees the other's move after a manual reload.
 *
 * Every open screen asks again at this rate, so it is multiplied by everyone who is signed in: at
 * 5,000 people, 30 seconds is about a third of the traffic that 10 seconds would be. Half a minute
 * is still quick for an artwork proof or an approval, which are acted on over hours.
 * TanStack Query pauses the polling while the tab is in the background (refetchIntervalInBackground
 * is off), so a tab nobody is looking at asks for nothing.
 */
export const LIVE_REFRESH_MS = 30_000

/** Counts and totals (approval badges, the orders summary) change less often than a list someone is watching: a minute is plenty. */
export const LIVE_COUNT_REFRESH_MS = 60_000

/** After this long with no touch, click or key press the person has probably stepped away from a tab that is still open. */
const IDLE_AFTER_MS = 5 * 60_000
/** ...so it asks this rarely, and goes back to the normal rate on the next touch (the next refetch happens on its own when they return). */
const IDLE_REFRESH_MS = 3 * 60_000

let lastTouch = Date.now()
if (typeof window !== 'undefined') {
  const touch = () => {
    lastTouch = Date.now()
  }
  for (const event of ['pointerdown', 'keydown', 'wheel', 'touchstart']) {
    window.addEventListener(event, touch, { passive: true })
  }
}

/**
 * The polling interval for a screen: `baseMs` while the person is using the app, much slower once they have gone quiet. A tab left
 * open on a desk all day is the common case in the field, and each one asks the server the same questions as an active one.
 */
export function liveRefresh(baseMs: number = LIVE_REFRESH_MS): () => number {
  return () => (Date.now() - lastTouch > IDLE_AFTER_MS ? Math.max(baseMs, IDLE_REFRESH_MS) : baseMs)
}

/** How often the signed-in person's own permissions are re-read -- they change when an admin edits a role, which is rare. */
export const PERMISSIONS_REFRESH_MS = 5 * 60_000
