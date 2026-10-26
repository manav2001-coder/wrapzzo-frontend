import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";

import { renderWithProviders } from "@/test/test-utils";
import { AppBreadcrumbs } from "./app-breadcrumbs";

describe("AppBreadcrumbs", () => {
  it("renders a crumb per path segment, linking all but the last", () => {
    renderWithProviders(<AppBreadcrumbs />, { route: "/fleet/agents/vehicle-health" });

    expect(screen.getByRole("link", { name: "Fleet" })).toHaveAttribute("href", "/fleet");
  });

  it("uses a label override instead of the raw segment", () => {
    renderWithProviders(<AppBreadcrumbs labels={{ settings: "App Settings" }} />, {
      route: "/settings",
    });
    expect(screen.getByText("App Settings")).toBeInTheDocument();
  });

  it("renders the last segment as the current page, not a link", () => {
    renderWithProviders(<AppBreadcrumbs />, { route: "/fleet/agents/vehicle-health" });

    expect(screen.getByRole("link", { name: "Fleet" })).toBeInTheDocument();
    expect(screen.getByText("Vehicle Health")).toHaveAttribute("aria-current", "page");
  });
});
