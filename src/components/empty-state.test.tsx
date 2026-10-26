import userEvent from "@testing-library/user-event";
import { Plus, Truck } from "lucide-react";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders, screen } from "@/test/test-utils";
import { EmptyState } from "./empty-state";

describe("EmptyState", () => {
  it("renders the title and description", () => {
    renderWithProviders(<EmptyState title="No vehicles" description="Add one to get started." />);
    expect(screen.getByRole("heading", { name: "No vehicles" })).toBeInTheDocument();
    expect(screen.getByText("Add one to get started.")).toBeInTheDocument();
  });

  it("fires a button action", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderWithProviders(
      <EmptyState title="No vehicles" action={{ label: "Add a vehicle", onClick, icon: Plus }} />,
    );

    await user.click(screen.getByRole("button", { name: "Add a vehicle" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders a routed action as a link", () => {
    renderWithProviders(
      <EmptyState title="No vehicles" action={{ label: "Browse", to: "/dashboard" }} />,
    );
    expect(screen.getByRole("link", { name: "Browse" })).toHaveAttribute("href", "/dashboard");
  });

  it("renders both actions", () => {
    renderWithProviders(
      <EmptyState
        title="No vehicles"
        action={{ label: "Add", onClick: vi.fn() }}
        secondaryAction={{ label: "Import", onClick: vi.fn() }}
      />,
    );
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Import" })).toBeInTheDocument();
  });

  it("draws a dashed panel for the card variant only", () => {
    const { container, rerender } = renderWithProviders(<EmptyState title="T" icon={Truck} />);
    expect(container.firstElementChild).toHaveClass("border-dashed");

    rerender(<EmptyState title="T" variant="plain" />);
    expect(container.firstElementChild).not.toHaveClass("border-dashed");
  });

  it("renders children between the description and the actions", () => {
    renderWithProviders(
      <EmptyState title="T">
        <span data-testid="extra">extra</span>
      </EmptyState>,
    );
    expect(screen.getByTestId("extra")).toBeInTheDocument();
  });
});
