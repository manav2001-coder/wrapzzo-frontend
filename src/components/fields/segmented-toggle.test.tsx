import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithProviders } from "@/test/test-utils";
import { SegmentedToggle } from "./segmented-toggle";

describe("SegmentedToggle", () => {
  it("flips value when clicking the inactive segment", async () => {
    const onChange = vi.fn();
    renderWithProviders(<SegmentedToggle value={false} onChange={onChange} />);

    await userEvent.click(screen.getByRole("radio", { name: "Yes" }));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("is a no-op when clicking the already-active segment", async () => {
    const onChange = vi.fn();
    renderWithProviders(<SegmentedToggle value={false} onChange={onChange} />);

    await userEvent.click(screen.getByRole("radio", { name: "No" }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
