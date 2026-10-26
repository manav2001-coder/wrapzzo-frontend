import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithProviders } from "@/test/test-utils";
import { MultiValuePopoverCell } from "./multi-value-popover-cell";

describe("MultiValuePopoverCell", () => {
  it("renders a dash for zero values", () => {
    renderWithProviders(<MultiValuePopoverCell values={[]} />);
    expect(screen.getByText("-")).toBeInTheDocument();
  });

  it("renders plain text for a single value", () => {
    renderWithProviders(<MultiValuePopoverCell values={["Pune"]} />);
    expect(screen.getByText("Pune")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("opens a popover listing all values for 2+ items", async () => {
    renderWithProviders(<MultiValuePopoverCell values={["Pune", "Nagpur"]} />);

    await userEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Pune")).toBeInTheDocument();
    expect(screen.getByText("Nagpur")).toBeInTheDocument();
  });

  it("renderTable mode renders a table with label/quantity columns", async () => {
    renderWithProviders(
      <MultiValuePopoverCell
        renderTable={[
          { label: "Seater", quantity: 30 },
          { label: "Sleeper", quantity: 10 },
        ]}
      />,
    );

    await userEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Seater")).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument();
  });
});
