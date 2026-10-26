import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithProviders } from "@/test/test-utils";
import { TextField } from "./text-field";

describe("TextField", () => {
  it("fires onChange while typing", async () => {
    let value = "";
    const onChange = (e: React.ChangeEvent<HTMLInputElement>) => (value = e.target.value);
    renderWithProviders(<TextField aria-label="name" onChange={onChange} />);

    await userEvent.type(screen.getByLabelText("name"), "Ada");
    expect(value).toBe("Ada");
  });

  it("shows a spinner and disables the input when loading", () => {
    renderWithProviders(<TextField aria-label="name" loading />);

    expect(screen.getByLabelText("name")).toBeDisabled();
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders start and end adornments", () => {
    renderWithProviders(
      <TextField
        aria-label="amount"
        startAdornment={<span>$</span>}
        endAdornment={<span>USD</span>}
      />,
    );

    expect(screen.getByText("$")).toBeInTheDocument();
    expect(screen.getByText("USD")).toBeInTheDocument();
  });
});
