import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithProviders } from "@/test/test-utils";
import { CheckboxField } from "./checkbox-field";

describe("CheckboxField", () => {
  it("calls onCheckedChange(true) when clicked", async () => {
    const onCheckedChange = vi.fn();
    renderWithProviders(
      <CheckboxField label="AC" checked={false} onCheckedChange={onCheckedChange} />,
    );

    await userEvent.click(screen.getByRole("checkbox", { name: "AC" }));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("renders the indeterminate state", () => {
    renderWithProviders(<CheckboxField label="AC" checked="indeterminate" />);
    expect(screen.getByRole("checkbox")).toHaveAttribute("data-state", "indeterminate");
  });

  it("renders helper text in destructive color when error", () => {
    renderWithProviders(<CheckboxField label="AC" checked={false} error helperText="Required" />);
    expect(screen.getByText("Required")).toHaveClass("text-destructive");
  });
});
