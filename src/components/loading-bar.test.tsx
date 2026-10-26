import { describe, expect, it } from "vitest";

import { render, screen } from "@/test/test-utils";
import { LoadingBar } from "./loading-bar";

describe("LoadingBar", () => {
  it("renders an indeterminate progressbar", () => {
    render(<LoadingBar />);
    const bar = screen.getByRole("progressbar", { name: "Loading" });
    expect(bar).toHaveAttribute("aria-busy", "true");
    // Indeterminate: reporting a number here would be inventing one.
    expect(bar).not.toHaveAttribute("aria-valuenow");
  });

  it("renders nothing when inactive", () => {
    render(<LoadingBar active={false} />);
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("pins to the viewport by default and sits in flow when inline", () => {
    const { rerender } = render(<LoadingBar />);
    expect(screen.getByRole("progressbar")).toHaveClass("fixed");

    rerender(<LoadingBar position="inline" />);
    expect(screen.getByRole("progressbar")).not.toHaveClass("fixed");
  });
});
