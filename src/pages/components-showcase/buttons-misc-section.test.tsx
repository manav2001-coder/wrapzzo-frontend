import { describe, expect, it } from "vitest";

import { renderWithProviders, screen } from "@/test/test-utils";
import { ButtonsMiscSection } from "./buttons-misc-section";

describe("ButtonsMiscSection", () => {
  it("renders every demo title", () => {
    renderWithProviders(<ButtonsMiscSection />);
    [
      "Button",
      "Badge / Chip variants",
      "Dot",
      "Avatar sizes",
      "IconButton",
      "Fab",
      "ButtonGroup",
      "Recipe: AnimateButton",
    ].forEach((title) => expect(screen.getByText(title)).toBeInTheDocument());
  });

  it("renders IconButton, Fab and ButtonGroup as real components", () => {
    renderWithProviders(<ButtonsMiscSection />);
    // "Send a gift" is used by both Fab demos.
    expect(screen.getAllByRole("button", { name: "Send a gift" }).length).toBeGreaterThan(1);
    expect(screen.getByRole("button", { name: "Delete gift" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "No tooltip" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Row actions" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Vertical actions" })).toBeInTheDocument();
  });
});
