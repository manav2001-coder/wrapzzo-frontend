import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";

import { Dot } from "./dot";

describe("Dot", () => {
  it("renders filled with the color class and inline size", () => {
    const { container } = render(<Dot color="success" size={10} />);
    const dot = container.firstElementChild as HTMLElement;
    expect(dot).toHaveClass("bg-success");
    expect(dot).toHaveStyle({ width: "10px", height: "10px" });
  });

  it("renders outlined with a border instead of a fill", () => {
    const { container } = render(<Dot color="warning" variant="outlined" />);
    const dot = container.firstElementChild as HTMLElement;
    expect(dot).toHaveClass("border-warning", "bg-transparent");
  });
});
