import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";

import { renderWithProviders } from "@/test/test-utils";
import { FormsSection } from "./forms-section";

describe("FormsSection", () => {
  it("renders every demo title", () => {
    renderWithProviders(<FormsSection />);
    [
      "Stepper",
      "DynamicFieldList",
      "FormGenerator - flat mode",
      "FormGenerator - stepper mode",
    ].forEach((title) => expect(screen.getByText(title)).toBeInTheDocument());
  });
});
