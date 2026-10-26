import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithProviders } from "@/test/test-utils";
import { Stepper } from "./stepper";

const STEPS = ["Details", "Documents", "Review"];

describe("Stepper", () => {
  it("renders all steps with the active one marked", () => {
    renderWithProviders(<Stepper steps={STEPS} activeStep={1} />);

    STEPS.forEach((step) => expect(screen.getByText(step)).toBeInTheDocument());
    const documentsStep = screen.getByText("Documents").closest("div");
    expect(documentsStep?.querySelector('[aria-current="true"]')).toBeInTheDocument();
  });

  it("calls onStepClick with the clicked index when clickable", async () => {
    const onStepClick = vi.fn();
    renderWithProviders(<Stepper steps={STEPS} activeStep={0} onStepClick={onStepClick} />);

    const buttons = screen.getAllByRole("button");
    await userEvent.click(buttons[2]!);
    expect(onStepClick).toHaveBeenCalledWith(2);
  });

  it("names every clickable step by its label - a completed one shows a check, not a number", () => {
    renderWithProviders(<Stepper steps={STEPS} activeStep={2} onStepClick={vi.fn()} />);
    for (const step of STEPS) {
      expect(screen.getByRole("button", { name: step })).toBeInTheDocument();
    }
  });

  it("hideLabels keeps the labels off screen but still names the steps", () => {
    renderWithProviders(<Stepper steps={STEPS} activeStep={1} onStepClick={vi.fn()} hideLabels />);
    expect(screen.queryByText("Documents")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Documents" })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  it("renders non-interactive steps when onStepClick is omitted", () => {
    renderWithProviders(<Stepper steps={STEPS} activeStep={0} />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});
