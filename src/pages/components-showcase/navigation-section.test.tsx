import { describe, expect, it, vi } from "vitest";

import { renderWithProviders, screen } from "@/test/test-utils";
import { NavigationSection } from "./navigation-section";

// The demo renders a real `<CommandPalette />`, which derives its actions from the signed-in nav.
vi.mock("@/hooks/use-current-user", () => ({
  useCurrentUser: () => ({ data: { companyId: "c1", companyName: "Acme", permissions: [] }, isLoading: false }),
  CURRENT_USER_QUERY_KEY: ["me"],
}));

describe("NavigationSection", () => {
  it("renders every demo title", () => {
    renderWithProviders(<NavigationSection />, { route: "/components" });
    [
      "NavGroup / NavCollapse / NavItem",
      "Collapsed nav rail",
      "AppTabs",
      "CommandPalette",
      "AppBreadcrumbs",
    ].forEach((title) => expect(screen.getByText(title)).toBeInTheDocument());
  });

  it("renders the demo tree expanded and as the icon-only rail", () => {
    renderWithProviders(<NavigationSection />, { route: "/components" });
    // Both trees render the "Campaigns" branch; the collapsed one has it only as a name.
    expect(screen.getAllByRole("button", { name: /campaigns/i }).length).toBeGreaterThan(1);
  });

  it("renders both AppTabs variants", () => {
    renderWithProviders(<NavigationSection />, { route: "/components" });
    expect(screen.getByRole("tab", { name: /audience/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /pills/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /audit/i })).toBeDisabled();
  });
});
