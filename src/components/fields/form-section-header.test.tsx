import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithProviders } from "@/test/test-utils";
import { FormSectionHeader } from "./form-section-header";

describe("FormSectionHeader", () => {
  it("renders the title and a separator", () => {
    renderWithProviders(<FormSectionHeader title="Documents" />);
    expect(screen.getByText("Documents")).toBeInTheDocument();
    expect(document.querySelector('[data-orientation="horizontal"]')).toBeInTheDocument();
  });

  it("calls onToggle with the flipped open state when collapsible", async () => {
    const onToggle = vi.fn();
    renderWithProviders(
      <FormSectionHeader title="Documents" collapsible open onToggle={onToggle} />,
    );

    await userEvent.click(screen.getByRole("button", { name: /collapse section/i }));
    expect(onToggle).toHaveBeenCalledWith(false);
  });
});
