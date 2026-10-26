import * as React from "react";

/** How long after a request a sidebar entry still counts it as for them (it may mount late). */
export const REVEAL_WINDOW_MS = 3000;

interface Reveal {
  url: string | null;
  /** Distinguishes two requests for the same url. */
  nonce: number;
  at: number;
}

let reveal: Reveal = { url: null, nonce: 0, at: 0 };
const listeners = new Set<() => void>();

/**
 * Asks the sidebar to show where a page lives: the groups above it open, the entry scrolls to the
 * top of the rail and pulses. The command palette calls it when a result is chosen. A module
 * store rather than an event, because the entry may not be mounted yet (its group is closed) and
 * reads the request when it appears.
 */
export function revealInNav(url: string) {
  reveal = { url, nonce: reveal.nonce + 1, at: Date.now() };
  listeners.forEach((listener) => listener());
}

/** Module scope, so its identity is stable: a new one each render would resubscribe every entry. */
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * The nonce of the latest reveal request when it is fresh and `matches` its url, else 0. A boolean
 * per entry rather than the request itself: a palette pick then redraws only the entries it is
 * about, not the whole rail. A new request for the same url is a new nonce, so an effect keyed on
 * it runs again. The snapshot also depends on the clock (`isFresh`), which the store does not
 * announce; that is safe because a new request always notifies, and a lapsed one only matters to
 * an entry that re-renders anyway.
 */
export function useNavReveal(matches: (url: string) => boolean): number {
  return React.useSyncExternalStore(subscribe, () =>
    reveal.url !== null && isFresh(reveal) && matches(reveal.url) ? reveal.nonce : 0,
  );
}

/** Whether `request` is recent enough to act on (an old one must not open a group on a remount). */
export function isFresh(request: Reveal): boolean {
  return request.url !== null && Date.now() - request.at < REVEAL_WINDOW_MS;
}
