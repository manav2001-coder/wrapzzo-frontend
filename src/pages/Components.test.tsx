import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";

import { renderWithProviders } from "@/test/test-utils";
import ComponentsPage from "./Components";
import { SECTIONS } from "@/pages/components-showcase/section-nav";

// The Navigation demo section renders a real `<CommandPalette />`, which derives its actions from
// the signed-in nav; a profile stub keeps the page network-free.
vi.mock("@/hooks/use-current-user", () => ({
  useCurrentUser: () => ({ data: { companyId: "c1", companyName: "Acme", permissions: [] }, isLoading: false }),
  CURRENT_USER_QUERY_KEY: ["me"],
}));

describe("ComponentsPage", () => {
  it("renders every section heading and a matching section-nav anchor", () => {
    renderWithProviders(<ComponentsPage />, { route: "/components" });

    SECTIONS.forEach((section) => {
      expect(screen.getByRole("heading", { name: section.label, level: 2 })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: section.label })).toHaveAttribute(
        "href",
        `#${section.id}`,
      );
    });
  });
});
