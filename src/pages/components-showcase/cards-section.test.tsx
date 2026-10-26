import { describe, expect, it } from "vitest";

import { renderWithProviders, screen } from "@/test/test-utils";
import { CardsSection } from "./cards-section";

describe("CardsSection", () => {
  it("renders the StatCard demo with all variants", () => {
    renderWithProviders(<CardsSection />);
    expect(screen.getByText("StatCard")).toBeInTheDocument();
    expect(screen.getByText("Orders this month")).toBeInTheDocument();
    expect(screen.getByText("Awaiting artwork review")).toBeInTheDocument();
  });
});
