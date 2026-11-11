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

/** How often the signed-in person's own permissions are re-read -- they change when an admin edits a role, which is rare. */
export const PERMISSIONS_REFRESH_MS = 5 * 60_000
