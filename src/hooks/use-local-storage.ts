import { useCallback, useEffect, useRef, useState } from "react";

/**
 * State persisted to `localStorage`, synced across tabs via the `storage` event.
 *
 * Ported from v4's `hooks/useLocalStorage.ts`, with one deliberate fix: v4 calls
 * `JSON.parse` unguarded, so a single malformed entry (a half-written value, a key
 * a user edited by hand, a schema change) throws during render and takes the whole
 * app down. Here a parse failure falls back to `defaultValue`, matching the
 * defensive `load()` in `use-table-column-config.ts`.
 *
 * `key` is the FULL storage key — callers pass the `mobixfl.` prefix themselves, so
 * grepping for a literal key finds its every use.
 *
 * **Re-reads from storage when `key` itself changes after mount.** The lazy `useState`
 * initializer below runs exactly once, against whatever `key` the FIRST render passed —
 * so a caller whose key is derived from data that is not yet loaded on that first render
 * (`useFranchiseScope`'s `` `mobixfl.franchiseScope.${user?.id ?? "anon"}` ``, before the
 * profile query resolves) would otherwise lock onto the PLACEHOLDER key's value forever,
 * even once the real key starts flowing in. `RequirePasswordSet` explicitly renders
 * children before the profile loads rather than blocking on it, so this is not a rare
 * timing edge — it is the normal shape of a cold page load for any dynamic-key caller.
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => read(key, defaultValue));

  // Skips the very first run, which would otherwise immediately re-read the same key the
  // lazy initializer above just read — harmless, but it would also mean this effect and
  // that initializer are two implementations of "the first read" that could drift.
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    setValue(read(key, defaultValue));
    // `defaultValue` is intentionally not a dep — see the identical note below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Cross-tab sync. `storage` fires only in OTHER tabs, so this never races the
  // local setter below.
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== key) return;
      setValue(read(key, defaultValue));
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
    // `defaultValue` is intentionally not a dep: a non-primitive default would be a
    // fresh reference every render and re-subscribe the listener on every one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === "function" ? (next as (prev: T) => T)(prev) : next;
        try {
          localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          // Quota exceeded or storage disabled (Safari private mode). Keep the
          // in-memory value — losing persistence is recoverable, throwing is not.
        }
        return resolved;
      });
    },
    [key],
  );

  return [value, set];
}

function read<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? defaultValue : (JSON.parse(raw) as T);
  } catch {
    return defaultValue;
  }
}
