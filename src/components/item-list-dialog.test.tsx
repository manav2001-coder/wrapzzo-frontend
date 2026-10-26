import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithProviders } from "@/test/test-utils";
import { ItemListDialog } from "./item-list-dialog";

describe("ItemListDialog", () => {
  it("renders each item and the title", () => {
    renderWithProviders(
      <ItemListDialog
        open
        onClose={vi.fn()}
        title="Stops on Route 42"
        items={["Branch", "Market", "Terminus"]}
      />,
    );

    expect(screen.getByText("Stops on Route 42")).toBeInTheDocument();
    expect(screen.getByText("Branch")).toBeInTheDocument();
    expect(screen.getByText("Terminus")).toBeInTheDocument();
  });

  it("calls onClose when the close button is clicked", async () => {
    const onClose = vi.fn();
    renderWithProviders(<ItemListDialog open onClose={onClose} title="Stops" items={["A"]} />);

    await userEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
