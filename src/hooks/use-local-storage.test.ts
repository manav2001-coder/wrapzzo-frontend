import { act } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { useLocalStorage } from "./use-local-storage";

const KEY = "mobixfl.test-key";

describe("useLocalStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns the default value when nothing is stored", () => {
    const { result } = renderHook(() => useLocalStorage(KEY, "fallback"));
    expect(result.current[0]).toBe("fallback");
  });

  it("initialises from an existing stored value", () => {
    localStorage.setItem(KEY, JSON.stringify({ a: 1 }));
    const { result } = renderHook(() => useLocalStorage<{ a: number }>(KEY, { a: 0 }));
    expect(result.current[0]).toEqual({ a: 1 });
  });

  it("persists a new value to localStorage", () => {
    const { result } = renderHook(() => useLocalStorage(KEY, false));
    act(() => result.current[1](true));
    expect(result.current[0]).toBe(true);
    expect(localStorage.getItem(KEY)).toBe("true");
  });

  it("supports a functional updater", () => {
    const { result } = renderHook(() => useLocalStorage(KEY, 1));
    act(() => result.current[1]((prev) => prev + 1));
    act(() => result.current[1]((prev) => prev + 1));
    expect(result.current[0]).toBe(3);
    expect(localStorage.getItem(KEY)).toBe("3");
  });

  // This is the v4 bug the hook exists to fix: v4's unguarded JSON.parse throws during
  // render on a malformed entry and takes the whole app down.
  it("falls back to the default on a malformed stored value instead of throwing", () => {
    localStorage.setItem(KEY, "{not json");
    const { result } = renderHook(() => useLocalStorage(KEY, "safe"));
    expect(result.current[0]).toBe("safe");
  });

  it("syncs from a storage event fired by another tab", () => {
    const { result } = renderHook(() => useLocalStorage(KEY, "initial"));
    act(() => {
      localStorage.setItem(KEY, JSON.stringify("from-other-tab"));
      window.dispatchEvent(new StorageEvent("storage", { key: KEY }));
    });
    expect(result.current[0]).toBe("from-other-tab");
  });

  it("ignores storage events for other keys", () => {
    const { result } = renderHook(() => useLocalStorage(KEY, "initial"));
    act(() => {
      localStorage.setItem("mobixfl.other", JSON.stringify("nope"));
      window.dispatchEvent(new StorageEvent("storage", { key: "mobixfl.other" }));
    });
    expect(result.current[0]).toBe("initial");
  });

  /**
   * Regression: `useFranchiseScope`'s key is `` `mobixfl.franchiseScope.${user?.id ?? "anon"}` ``
   * — a placeholder before the profile query resolves, the real id a moment later.
   * `RequirePasswordSet` renders children WHILE the profile is still loading rather than
   * blocking on it, so this transition happens on every cold page load, not just in a test.
   * Before this test existed, the hook's `useState` initializer ran once against the
   * PLACEHOLDER key and never re-read once the real key arrived, so a genuinely remembered
   * value sat in storage, invisible, forever.
   */
  it("re-reads from storage when the key itself changes after mount", () => {
    localStorage.setItem("mobixfl.test-key.real", JSON.stringify("remembered"));
    const { result, rerender } = renderHook(({ key }) => useLocalStorage(key, "fallback"), {
      initialProps: { key: "mobixfl.test-key.anon" },
    });
    expect(result.current[0]).toBe("fallback");

    rerender({ key: "mobixfl.test-key.real" });
    expect(result.current[0]).toBe("remembered");
  });

  it("removes its storage listener on unmount", () => {
    const { result, unmount } = renderHook(() => useLocalStorage(KEY, "initial"));
    unmount();
    localStorage.setItem(KEY, JSON.stringify("after-unmount"));
    window.dispatchEvent(new StorageEvent("storage", { key: KEY }));
    expect(result.current[0]).toBe("initial");
  });
});
