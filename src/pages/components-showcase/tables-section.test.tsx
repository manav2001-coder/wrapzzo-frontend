import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { renderWithProviders, screen } from "@/test/test-utils";
import { TablesSection } from "./tables-section";

describe("TablesSection", () => {
  it("renders the DataTable demo with dummy order rows", () => {
    renderWithProviders(<TablesSection />);
    expect(screen.getByText("DataTable")).toBeInTheDocument();
    expect(screen.getByText("ORD-1042")).toBeInTheDocument();
  });

  it("gives the demo table sortable headers and a per-column search box", () => {
    // `listFields` drives both. The demo's columns are declared with `accessorKey` and no
    // explicit `id`, which is the case a variant lookup by id alone would silently lose.
    renderWithProviders(<TablesSection />);
    expect(screen.getAllByPlaceholderText("Search Recipient").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /^Gift/ }).length).toBeGreaterThan(0);
  });

  it("renders the EmptyTable demo with its custom empty state", () => {
    renderWithProviders(<TablesSection />);
    expect(screen.getByText("EmptyTable")).toBeInTheDocument();
    expect(screen.getByText("No orders yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send a gift" })).toBeInTheDocument();
  });

  it("offers the user's column layout: resize handles, and a Columns menu that can reset it", async () => {
    renderWithProviders(<TablesSection />);
    expect(screen.getAllByRole("separator").length).toBeGreaterThan(0);
    await userEvent.click(screen.getAllByRole("button", { name: "Configure columns" })[0]!);
    expect(await screen.findByRole("button", { name: "Reset columns to default" })).toBeVisible();
  });
});
