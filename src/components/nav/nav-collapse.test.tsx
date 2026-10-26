import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithProviders } from "@/test/test-utils";
import { NavRailProvider } from "./nav-context";
import { NavCollapse } from "./nav-collapse";
import type { NavItemType } from "./nav-types";

function buildTree(): NavItemType {
  return {
    id: "fleet",
    title: "Fleet",
    type: "collapse",
    children: [
      {
        id: "routes",
        title: "Routes",
        type: "collapse",
        children: [
          { id: "active", title: "Active", type: "item", url: "/fleet/routes/active" },
          { id: "archived", title: "Archived", type: "item", url: "/fleet/routes/archived" },
        ],
      },
      { id: "vehicles", title: "Vehicles", type: "item", url: "/fleet/vehicles" },
    ],
  };
}

describe("NavCollapse", () => {
  it("auto-expands the branch containing the active route", () => {
    renderWithProviders(<NavCollapse item={buildTree()} depth={1} />, {
      route: "/fleet/routes/active",
    });

    expect(screen.getByRole("link", { name: /active/i })).toBeInTheDocument();
  });

  it("stays collapsed when no descendant is active, and toggles open on click", async () => {
    renderWithProviders(<NavCollapse item={buildTree()} depth={1} />, { route: "/somewhere-else" });

    expect(screen.queryByRole("link", { name: /vehicles/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /fleet/i }));
    expect(screen.getByRole("link", { name: /vehicles/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /fleet/i }));
    expect(screen.queryByRole("link", { name: /vehicles/i })).not.toBeInTheDocument();
  });

  describe("collapsed rail", () => {
    const renderCollapsed = (route: string) =>
      renderWithProviders(
        <NavRailProvider collapsed>
          <NavCollapse item={buildTree()} depth={1} />
        </NavRailProvider>,
        { route },
      );

    it("renders an icon-only trigger named by the branch title", () => {
      renderCollapsed("/somewhere-else");
      const trigger = screen.getByRole("button", { name: "Fleet" });
      expect(trigger).toHaveAttribute("aria-expanded", "false");
      // The inline label is gone, and children are not inline-expanded.
      expect(screen.queryByRole("link", { name: /vehicles/i })).not.toBeInTheDocument();
    });

    /**
     * The branch's inline `open` state is initialised once from the pathname and never
     * re-derived, so it must be ignored while collapsed — otherwise an active branch would
     * render its children BOTH inline (in a 4rem-wide rail) and in the flyout.
     */
    it("does not inline-expand an active branch while collapsed", () => {
      renderCollapsed("/fleet/routes/active");
      expect(screen.queryByRole("link", { name: /^active$/i })).not.toBeInTheDocument();
    });

    it("opens a flyout with the children rendered expanded", async () => {
      renderCollapsed("/somewhere-else");
      await userEvent.click(screen.getByRole("button", { name: "Fleet" }));

      // Inside the flyout the nav renders as if uncollapsed: section label and full links.
      expect(await screen.findByRole("link", { name: /vehicles/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Fleet" })).toHaveAttribute(
        "aria-expanded",
        "true",
      );
    });

    /**
     * Light mode only, and unmeasurable in jsdom — so this pins the class. The flyout's items
     * carry the sidebar's LIGHT text; `.sidebar` alone lost to PopoverContent's `bg-popover`
     * utility, so in light mode they sat on a white panel and were barely readable.
     */
    // A group icon said nothing until clicked, while the plain links beside it had a tooltip.
    // Focus rather than hover: jsdom's synthetic pointer events don't satisfy Radix's tracking.
    it("names the group in a tooltip, like the collapsed links do", async () => {
      renderCollapsed("/somewhere-else");
      await userEvent.tab();
      await waitFor(() => expect(screen.getByRole("tooltip")).toHaveTextContent("Fleet"));
    });

    it("paints the flyout with the sidebar's own background, not the popover's", async () => {
      renderCollapsed("/somewhere-else");
      await userEvent.click(screen.getByRole("button", { name: "Fleet" }));

      const panel = (await screen.findByRole("link", { name: /vehicles/i })).closest(
        "[data-radix-popper-content-wrapper] > *",
      );
      expect(panel).toHaveClass("bg-sidebar");
      expect(panel).not.toHaveClass("bg-popover");
    });
  });
});
