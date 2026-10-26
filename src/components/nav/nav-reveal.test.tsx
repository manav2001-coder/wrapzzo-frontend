import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithProviders } from "@/test/test-utils";
import { NavCollapse } from "./nav-collapse";
import { revealInNav } from "./nav-reveal";
import type { NavItemType } from "./nav-types";

const TREE: NavItemType = {
  id: "fleet",
  title: "Fleet",
  type: "collapse",
  children: [
    {
      id: "routes",
      title: "Routes",
      type: "collapse",
      children: [{ id: "active", title: "Active", type: "item", url: "/fleet/routes/active" }],
    },
    { id: "vehicles", title: "Vehicles", type: "item", url: "/fleet/vehicles" },
  ],
};

describe("revealing a page in the sidebar", () => {
  const scrollIntoView = vi.fn();

  let minutes = 0;
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    // The request store is module-wide: each test starts a clock past the last one's requests.
    vi.setSystemTime(Date.now() + ++minutes * 600_000);
    Element.prototype.scrollIntoView = scrollIntoView;
    scrollIntoView.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("opens every closed group above the page, brings it to the top of the rail and pulses it", async () => {
    renderWithProviders(<NavCollapse item={TREE} depth={1} />, { route: "/somewhere-else" });
    expect(screen.queryByRole("link", { name: "Active" })).not.toBeInTheDocument();

    act(() => revealInNav("/fleet/routes/active"));

    const link = await screen.findByRole("link", { name: "Active" });
    expect(link).toHaveAttribute("data-revealed", "true");
    // Waits out the group opening, then scrolls the entry to the top.
    expect(scrollIntoView).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(300));
    expect(scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ block: "start" }));
    expect(scrollIntoView.mock.contexts[0]).toBe(link);

    // The pulse is brief: the entry then settles.
    await act(() => vi.advanceTimersByTimeAsync(2500));
    expect(screen.getByRole("link", { name: "Active" })).not.toHaveAttribute("data-revealed");
  });

  it("leaves a group alone when the page is somewhere else", async () => {
    renderWithProviders(<NavCollapse item={TREE} depth={1} />, { route: "/somewhere-else" });
    act(() => revealInNav("/elsewhere/entirely"));
    await act(() => vi.advanceTimersByTimeAsync(300));
    expect(screen.queryByRole("link", { name: "Vehicles" })).not.toBeInTheDocument();
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("only ever opens a group: the user can still close the one holding the page", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProviders(<NavCollapse item={TREE} depth={1} />, { route: "/fleet/vehicles" });
    expect(screen.getByRole("link", { name: "Vehicles" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /fleet/i }));
    expect(screen.queryByRole("link", { name: "Vehicles" })).not.toBeInTheDocument();
  });
});
