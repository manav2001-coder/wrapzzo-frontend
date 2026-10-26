import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { renderWithProviders, screen, waitFor } from "@/test/test-utils";
import { LayoutSection } from "./layout-section";

describe("LayoutSection", () => {
  it("renders every demo title", () => {
    renderWithProviders(<LayoutSection />);
    ["SectionCard", "LoadingBar", "EmptyState", "ScrollTop"].forEach((title) =>
      expect(screen.getByText(title)).toBeInTheDocument(),
    );
  });

  it("renders the SectionCard prop matrix", () => {
    renderWithProviders(<LayoutSection />);
    expect(screen.getByText("Gift details")).toBeInTheDocument();
    expect(screen.getByText("Elevated")).toBeInTheDocument();
    expect(screen.getByText("Borderless")).toBeInTheDocument();
    // The loading card shows a skeleton instead of its children.
    expect(screen.getByTestId("section-card-skeleton")).toBeInTheDocument();
    expect(screen.queryByText("Never seen.")).not.toBeInTheDocument();
  });

  it("toggles the LoadingBar demo", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LayoutSection />);

    expect(screen.queryByRole("progressbar", { name: "Loading" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Toggle" }));
    await waitFor(() =>
      expect(screen.getByRole("progressbar", { name: "Loading" })).toBeInTheDocument(),
    );
  });

  it("renders the EmptyState demo with both actions", () => {
    renderWithProviders(<LayoutSection />);
    expect(screen.getByText("No gifts yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add a gift" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Import sheet" })).toBeInTheDocument();
  });
});
