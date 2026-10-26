import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithProviders } from "@/test/test-utils";
import { RadioGroupField } from "./radio-group-field";

const OPTIONS = [
  { value: "diesel", label: "Diesel" },
  { value: "cng", label: "CNG" },
  { value: "electric", label: "Electric", disabled: true },
];

describe("RadioGroupField", () => {
  it("calls onValueChange with the clicked option's value", async () => {
    const onValueChange = vi.fn();
    renderWithProviders(
      <RadioGroupField
        name="fuel"
        label="Fuel type"
        value="diesel"
        onValueChange={onValueChange}
        options={OPTIONS}
      />,
    );

    await userEvent.click(screen.getByRole("radio", { name: "CNG" }));
    expect(onValueChange).toHaveBeenCalledWith("cng");
  });

  it("disables an option marked disabled", () => {
    renderWithProviders(
      <RadioGroupField name="fuel" value="diesel" onValueChange={vi.fn()} options={OPTIONS} />,
    );
    expect(screen.getByRole("radio", { name: "Electric" })).toBeDisabled();
  });

  it("applies a row layout class when row is set", () => {
    renderWithProviders(
      <RadioGroupField name="fuel" value="diesel" onValueChange={vi.fn()} options={OPTIONS} row />,
    );
    expect(screen.getByRole("radiogroup")).toHaveClass("flex-row");
  });
});
