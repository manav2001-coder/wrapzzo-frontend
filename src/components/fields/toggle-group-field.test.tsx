import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithProviders } from "@/test/test-utils";
import { ToggleGroupField } from "./toggle-group-field";

const OPTIONS = [
  { value: "list", label: "List" },
  { value: "map", label: "Map" },
];

describe("ToggleGroupField", () => {
  it("exclusive mode: selecting one deselects the previous", async () => {
    const onValueChange = vi.fn();
    renderWithProviders(
      <ToggleGroupField options={OPTIONS} value="list" onValueChange={onValueChange} />,
    );

    await userEvent.click(screen.getByRole("radio", { name: "Map" }));
    expect(onValueChange).toHaveBeenCalledWith("map");
  });

  it("non-exclusive mode: toggles membership in the array", async () => {
    const onValueChange = vi.fn();
    renderWithProviders(
      <ToggleGroupField
        options={OPTIONS}
        exclusive={false}
        value={["list"]}
        onValueChange={onValueChange}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Map" }));
    expect(onValueChange).toHaveBeenCalledWith(["list", "map"]);
  });
});
