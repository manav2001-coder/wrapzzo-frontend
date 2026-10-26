import userEvent from "@testing-library/user-event";
import { Plus } from "lucide-react";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders, screen, waitFor } from "@/test/test-utils";
import { Fab } from "./fab";

describe("Fab", () => {
  it("is labelled and clickable", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderWithProviders(<Fab icon={Plus} label="Add a vehicle" onClick={onClick} />);

    const button = screen.getByRole("button", { name: "Add a vehicle" });
    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("shows a tooltip when icon-only", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Fab icon={Plus} label="Add a vehicle" />);

    await user.tab();
    await waitFor(() => expect(screen.getByRole("tooltip")).toHaveTextContent("Add a vehicle"));
  });

  it("shows the label inline when extended, with no duplicate tooltip", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Fab icon={Plus} label="Add a vehicle" extended />);

    expect(screen.getByRole("button", { name: "Add a vehicle" })).toBeInTheDocument();
    await user.tab();
    // The label is already visible; repeating it in a tooltip would be noise.
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("positions itself in the corner by default and in flow when position is none", () => {
    const { rerender } = renderWithProviders(<Fab icon={Plus} label="Add" />);
    expect(screen.getByRole("button", { name: "Add" })).toHaveClass("fixed");

    rerender(<Fab icon={Plus} label="Add" position="none" />);
    expect(screen.getByRole("button", { name: "Add" })).not.toHaveClass("fixed");
  });

  it("delegates loading to Button", () => {
    renderWithProviders(<Fab icon={Plus} label="Add" loading />);
    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
  });
});
