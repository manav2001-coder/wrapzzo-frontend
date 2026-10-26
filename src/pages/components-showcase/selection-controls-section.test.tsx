import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";

import { renderWithProviders } from "@/test/test-utils";
import { SelectionControlsSection } from "./selection-controls-section";

describe("SelectionControlsSection", () => {
  it("renders every demo title", () => {
    renderWithProviders(<SelectionControlsSection />);
    ["CheckboxField", "RadioGroupField", "SwitchField", "SegmentedToggle"].forEach((title) =>
      expect(screen.getByText(title)).toBeInTheDocument(),
    );
  });
});
