import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NavRailProvider, useNavRail } from "./nav-context";

describe("useNavRail", () => {
  // Defaults to expanded so any nav rendered without a provider behaves as before.
  it("reports expanded with no provider", () => {
    const { result } = renderHook(() => useNavRail());
    expect(result.current.collapsed).toBe(false);
  });

  it("reports the provider's value", () => {
    const { result } = renderHook(() => useNavRail(), {
      wrapper: ({ children }) => <NavRailProvider collapsed>{children}</NavRailProvider>,
    });
    expect(result.current.collapsed).toBe(true);
  });

  it("an inner provider overrides an outer one", () => {
    const { result } = renderHook(() => useNavRail(), {
      wrapper: ({ children }) => (
        <NavRailProvider collapsed>
          <NavRailProvider collapsed={false}>{children}</NavRailProvider>
        </NavRailProvider>
      ),
    });
    // This is what lets a collapsed rail's flyout render its children expanded.
    expect(result.current.collapsed).toBe(false);
  });
});
