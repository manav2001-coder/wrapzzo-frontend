import userEvent from "@testing-library/user-event";
import { Trash2 } from "lucide-react";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders, screen, waitFor } from "@/test/test-utils";
import { IconButton } from "./icon-button";

describe("IconButton", () => {
  it("exposes the label as its accessible name", () => {
    renderWithProviders(<IconButton icon={Trash2} label="Delete vehicle" />);
    expect(screen.getByRole("button", { name: "Delete vehicle" })).toBeInTheDocument();
  });

  // Focus rather than hover: Radix opens the tooltip on either, and focus is the reliable
  // trigger in jsdom (synthetic pointer events don't always satisfy its hover tracking).
  it("shows a tooltip when the trigger is focused", async () => {
    const user = userEvent.setup();
    renderWithProviders(<IconButton icon={Trash2} label="Delete vehicle" />);

    await user.tab();
    await waitFor(() => expect(screen.getByRole("tooltip")).toHaveTextContent("Delete vehicle"));
  });

  it("uses a custom tooltip string while keeping the label as the accessible name", async () => {
    const user = userEvent.setup();
    renderWithProviders(<IconButton icon={Trash2} label="Delete" tooltip="Delete permanently" />);

    await user.tab();
    await waitFor(() =>
      expect(screen.getByRole("tooltip")).toHaveTextContent("Delete permanently"),
    );
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("renders no tooltip when tooltip is false", async () => {
    const user = userEvent.setup();
    renderWithProviders(<IconButton icon={Trash2} label="Delete" tooltip={false} />);

    await user.tab();
    // The accessible name survives; no tooltip element is ever created.
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    expect(screen.queryAllByText("Delete")).toHaveLength(0);
  });

  it("fires onClick", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderWithProviders(<IconButton icon={Trash2} label="Delete" onClick={onClick} />);

    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("applies a tone class", () => {
    renderWithProviders(<IconButton icon={Trash2} label="Delete" tone="destructive" />);
    expect(screen.getByRole("button", { name: "Delete" })).toHaveClass("text-destructive");
  });

  it("honours disabled and loading from Button", () => {
    const { rerender } = renderWithProviders(<IconButton icon={Trash2} label="Delete" disabled />);
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();

    rerender(<IconButton icon={Trash2} label="Delete" loading />);
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
  });
});
