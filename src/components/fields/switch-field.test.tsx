import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithProviders } from "@/test/test-utils";
import { SwitchField } from "./switch-field";

describe("SwitchField", () => {
  it("toggles checked state on click", async () => {
    const onCheckedChange = vi.fn();
    renderWithProviders(
      <SwitchField label="Live tracking" checked={false} onCheckedChange={onCheckedChange} />,
    );

    await userEvent.click(screen.getByRole("switch", { name: "Live tracking" }));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("ignores clicks when disabled", async () => {
    const onCheckedChange = vi.fn();
    renderWithProviders(
      <SwitchField
        label="Live tracking"
        checked={false}
        onCheckedChange={onCheckedChange}
        disabled
      />,
    );

    await userEvent.click(screen.getByRole("switch", { name: "Live tracking" }));
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});
