import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";

import { renderWithProviders } from "@/test/test-utils";
import { PickersSection } from "./pickers-section";

describe("PickersSection", () => {
  it("renders every demo title", () => {
    renderWithProviders(<PickersSection />);
    ["DatePicker", "DateTimePicker", "DateRangePicker", "WeeklySchedulePicker"].forEach((title) =>
      expect(screen.getByText(title)).toBeInTheDocument(),
    );
  });
});
