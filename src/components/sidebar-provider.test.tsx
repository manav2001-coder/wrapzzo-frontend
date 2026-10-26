import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { SIDEBAR_COLLAPSED_KEY, SidebarProvider, useSidebar } from "./sidebar-provider";

function wrapper({ children }: { children: React.ReactNode }) {
  return <SidebarProvider>{children}</SidebarProvider>;
}

describe("SidebarProvider", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to expanded", () => {
    const { result } = renderHook(() => useSidebar(), { wrapper });
    expect(result.current.collapsed).toBe(false);
  });

  it("reads the persisted collapsed state on mount", () => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, "true");
    const { result } = renderHook(() => useSidebar(), { wrapper });
    expect(result.current.collapsed).toBe(true);
  });

  it("toggle flips and persists the state", () => {
    const { result } = renderHook(() => useSidebar(), { wrapper });
    act(() => result.current.toggle());
    expect(result.current.collapsed).toBe(true);
    expect(localStorage.getItem(SIDEBAR_COLLAPSED_KEY)).toBe("true");
    act(() => result.current.toggle());
    expect(result.current.collapsed).toBe(false);
    expect(localStorage.getItem(SIDEBAR_COLLAPSED_KEY)).toBe("false");
  });

  it("setCollapsed sets the state directly", () => {
    const { result } = renderHook(() => useSidebar(), { wrapper });
    act(() => result.current.setCollapsed(true));
    expect(result.current.collapsed).toBe(true);
  });

  it("throws when used outside the provider", () => {
    expect(() => renderHook(() => useSidebar())).toThrow(/within <SidebarProvider>/);
  });
});
