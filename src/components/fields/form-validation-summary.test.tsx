import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";

import { renderWithProviders } from "@/test/test-utils";

import { FormValidationSummary, type ValidationSummaryRow } from "./form-validation-summary";

const row = (missing: string[]): ValidationSummaryRow => ({
  stepIndex: 0,
  stepTitle: "Basics",
  missing,
  invalid: [],
  firstFieldId: "name",
});

describe("FormValidationSummary", () => {
  it("announces only its fixed heading, so fixing a field does not re-announce the panel", () => {
    const onGo = vi.fn();
    const { rerender } = renderWithProviders(
      <FormValidationSummary rows={[row(["Name", "Email"])]} general={[]} onGo={onGo} />,
    );
    const live = screen.getByRole("alert");
    expect(live).toHaveTextContent("Can't save yet");
    expect(live).not.toHaveTextContent("Name");
    expect(live).not.toHaveAttribute("aria-live", "assertive");

    rerender(<FormValidationSummary rows={[row(["Email"])]} general={[]} onGo={onGo} />);
    expect(screen.getByRole("alert")).toBe(live);
    expect(screen.getByRole("alert").textContent).toBe(live.textContent);
  });

  it("lists two identical general messages without a key clash", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      renderWithProviders(
        <FormValidationSummary
          rows={[]}
          general={["Too many lines", "Too many lines"]}
          onGo={vi.fn()}
        />,
      );
      expect(screen.getAllByText("Too many lines")).toHaveLength(2);
      expect(error.mock.calls.some((call) => String(call[0]).includes("same key"))).toBe(false);
    } finally {
      error.mockRestore();
    }
  });
});
