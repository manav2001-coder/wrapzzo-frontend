import { describe, expect, it } from "vitest";

import { renderWithProviders, screen } from "@/test/test-utils";
import { InputsSection } from "./inputs-section";

describe("InputsSection", () => {
  it("renders every demo title", () => {
    renderWithProviders(<InputsSection />);
    ["TextField", "PasswordInput", "NumberInput", "Combobox", "AsyncCombobox"].forEach((title) =>
      expect(screen.getByText(title)).toBeInTheDocument(),
    );
  });
});
