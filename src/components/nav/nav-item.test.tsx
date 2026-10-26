import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { LayoutDashboard } from "lucide-react";

import { renderWithProviders } from "@/test/test-utils";
import { NavRailProvider } from "./nav-context";
import { NavItem } from "./nav-item";
import type { NavItemType } from "./nav-types";

describe("NavItem", () => {
  it("renders a badge when provided", () => {
    const item: NavItemType = {
      id: "vehicles",
      title: "Vehicles",
      type: "item",
      url: "/vehicles",
      icon: LayoutDashboard,
      badge: { label: "New" },
    };
    renderWithProviders(<NavItem item={item} depth={1} />);

    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it("marks the link active when the route matches", () => {
    const item: NavItemType = {
      id: "dashboard",
      title: "Dashboard",
      type: "item",
      url: "/dashboard",
      end: true,
    };
    renderWithProviders(<NavItem item={item} depth={1} />, { route: "/dashboard" });

    expect(screen.getByRole("link", { name: /dashboard/i })).toHaveClass("active");
  });

  describe("collapsed rail", () => {
    const badged: NavItemType = {
      id: "vehicles",
      title: "Vehicles",
      type: "item",
      url: "/vehicles",
      icon: LayoutDashboard,
      badge: { label: "New" },
    };

    const renderCollapsed = (item: NavItemType, route = "/") =>
      renderWithProviders(
        <NavRailProvider collapsed>
          <NavItem item={item} depth={1} />
        </NavRailProvider>,
        { route },
      );

    it("hides the label but keeps the link named via aria-label", () => {
      renderCollapsed(badged);
      expect(screen.getByRole("link", { name: "Vehicles" })).toHaveAttribute("href", "/vehicles");
      // The visible text is gone — only the accessible name remains.
      expect(screen.queryByText("Vehicles")).not.toBeInTheDocument();
    });

    it("replaces a text badge with a status dot", () => {
      renderCollapsed(badged);
      expect(screen.queryByText("New")).not.toBeInTheDocument();
    });

    it("centers the icon without needing !important", () => {
      renderCollapsed(badged);
      const link = screen.getByRole("link", { name: "Vehicles" });
      expect(link).toHaveClass("justify-center");
      expect(link).toHaveClass("px-0");
    });

    /**
     * Radix's `asChild` merges className as a STRING. Given NavLink's `({ isActive }) => …`
     * callback it stringifies the function source, leaving the element classed with the
     * literal text of the callback — which silently contains "active" and "justify-center",
     * so naive assertions pass while every style is broken. Pin the real class list.
     */
    it("gets a real class list, not a stringified className callback", () => {
      renderCollapsed(badged);
      const className = screen.getByRole("link", { name: "Vehicles" }).className;
      expect(className).not.toContain("isActive");
      expect(className).not.toContain("=>");
      expect(className.split(/\s+/)).toContain("sidebar-nav-item");
    });

    it("still marks the active route, and only the active route", () => {
      const item: NavItemType = {
        id: "dashboard",
        title: "Dashboard",
        type: "item",
        url: "/dashboard",
        end: true,
      };
      const { unmount } = renderCollapsed(item, "/dashboard");
      expect(screen.getByRole("link", { name: "Dashboard" })).toHaveClass("active");
      unmount();

      // The negative case is what catches a stringified callback: that always "contains"
      // the word active, whatever the route.
      renderCollapsed(item, "/settings");
      expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveClass("active");
    });
  });
});
