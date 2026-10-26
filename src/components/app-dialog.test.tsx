import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders, screen, waitFor } from "@/test/test-utils";
import { AppDialog } from "./app-dialog";

describe("AppDialog", () => {
  it("renders nothing when closed", () => {
    renderWithProviders(<AppDialog open={false} onOpenChange={vi.fn()} title="Confirm" />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders title, description and children", () => {
    renderWithProviders(
      <AppDialog
        open
        onOpenChange={vi.fn()}
        title="Retire vehicle"
        description="This cannot be undone."
      >
        <p>MH12AB1234</p>
      </AppDialog>,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Retire vehicle")).toBeInTheDocument();
    expect(screen.getByText("This cannot be undone.")).toBeInTheDocument();
    expect(screen.getByText("MH12AB1234")).toBeInTheDocument();
  });

  it("shows a cancel button but no confirm without onConfirm", () => {
    renderWithProviders(<AppDialog open onOpenChange={vi.fn()} title="T" />);
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirm" })).not.toBeInTheDocument();
  });

  it("calls onConfirm and closes via cancel", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    renderWithProviders(
      <AppDialog
        open
        onOpenChange={onOpenChange}
        title="T"
        onConfirm={onConfirm}
        confirmLabel="Retire"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Retire" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("renders a custom footer instead of the shorthand", () => {
    renderWithProviders(
      <AppDialog
        open
        onOpenChange={vi.fn()}
        title="T"
        footer={<button type="button">Archive</button>}
      />,
    );
    expect(screen.getByRole("button", { name: "Archive" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
  });

  it("spins confirm and disables cancel while loading", () => {
    renderWithProviders(
      <AppDialog open onOpenChange={vi.fn()} title="T" onConfirm={vi.fn()} loading />,
    );
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeDisabled();
  });

  it("renders an error message as an alert", () => {
    renderWithProviders(<AppDialog open onOpenChange={vi.fn()} title="T" error="Could not save" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Could not save");
  });

  it("applies the size class", () => {
    renderWithProviders(<AppDialog open onOpenChange={vi.fn()} title="T" size="xl" />);
    expect(screen.getByRole("dialog")).toHaveClass("max-w-4xl");
  });

  it("hides the corner close button when asked", () => {
    const { rerender } = renderWithProviders(<AppDialog open onOpenChange={vi.fn()} title="T" />);
    // Radix's own sr-only "Close" button.
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();

    rerender(<AppDialog open onOpenChange={vi.fn()} title="T" hideCloseButton />);
    expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
  });

  it("blocks Escape dismissal when disableDismiss is set", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    renderWithProviders(<AppDialog open onOpenChange={onOpenChange} title="T" disableDismiss />);

    await user.keyboard("{Escape}");
    await waitFor(() => expect(onOpenChange).not.toHaveBeenCalled());
    // And the corner close button is gone, so there is no dismissal path at all.
    expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
  });

  it("allows Escape dismissal by default", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    renderWithProviders(<AppDialog open onOpenChange={onOpenChange} title="T" />);

    await user.keyboard("{Escape}");
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});

/**
 * The dialog body clipped its own focus rings.
 *
 * `overflow-y-auto` computes `overflow-x` to `auto` as well — CSS does not allow one axis to be
 * `visible` while the other is not — so the body is a scroll container in BOTH directions. With
 * no padding, a full-width field's border box sat exactly flush with that clipping edge
 * (measured in Chromium at 0px of room) and `focus-visible:ring-1`, drawn OUTSIDE the border
 * box, was shaved off. The `-mx-1 px-1` pair buys 4px of room and puts the content back where
 * it was, so nothing moves.
 *
 * jsdom performs no layout, so the clipping itself is unmeasurable here — the classes are what
 * this can pin. The real check was a browser measurement: padding 0 → 4px with the content
 * width unchanged at 622px.
 */
describe("the scrollable body leaves room for a focus ring", () => {
  it("pads the scroll box and pulls it back out, so content stays aligned", () => {
    const { container } = renderWithProviders(
      <AppDialog open onOpenChange={vi.fn()} title="T">
        <input aria-label="field" />
      </AppDialog>,
    );

    const body = container.ownerDocument.querySelector(".overflow-y-auto");
    expect(body).toBeInTheDocument();
    // Padding for the ring, negative margin so the content does not shift.
    expect(body).toHaveClass("px-1", "-mx-1", "py-1");
  });

  it("lets the body take the height the header and footer leave, rather than a fixed 60vh", () => {
    // A hardcoded `max-h-[60vh]` sliced a field row in half at both ends whatever the dialog's
    // actual height, and put the cut right against the footer. `DialogContent` is capped
    // instead, so the body only scrolls when the content genuinely does not fit.
    const { container } = renderWithProviders(
      <AppDialog open onOpenChange={vi.fn()} title="T">
        <input aria-label="field" />
      </AppDialog>,
    );

    const body = container.ownerDocument.querySelector(".overflow-y-auto");
    expect(body).toHaveClass("flex-1", "min-h-0");
    expect(body).not.toHaveClass("max-h-[60vh]");
  });

  it("bounds the dialog itself, so its last fields are never unreachable", () => {
    renderWithProviders(
      <AppDialog open onOpenChange={vi.fn()} title="T">
        <input aria-label="field" />
      </AppDialog>,
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveClass("max-h-[calc(100vh-4rem)]", "flex", "flex-col");
  });
});
