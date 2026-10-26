import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithProviders } from "@/test/test-utils";
import { NumberInput } from "./number-input";

describe("NumberInput", () => {
  it("increments and decrements by step", async () => {
    const onChange = vi.fn();
    renderWithProviders(<NumberInput value={5} step={1} onChange={onChange} />);

    await userEvent.click(screen.getByRole("button", { name: /increment/i }));
    expect(onChange).toHaveBeenCalledWith(6);

    await userEvent.click(screen.getByRole("button", { name: /decrement/i }));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("multiplies the step by shiftMultiplier when Shift is held", async () => {
    const onChange = vi.fn();
    renderWithProviders(
      <NumberInput value={10} step={1} shiftMultiplier={10} onChange={onChange} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /increment/i }), { shiftKey: true });
    expect(onChange).toHaveBeenCalledWith(20);
  });

  it("blocks typing a minus sign when onlyPositiveValuesAllowed", async () => {
    const onChange = vi.fn();
    renderWithProviders(<NumberInput value={null} onlyPositiveValuesAllowed onChange={onChange} />);

    const input = screen.getByRole("textbox");
    await userEvent.type(input, "-5");
    expect(onChange).not.toHaveBeenCalledWith(-5);
  });

  it("keeps stepper buttons live while disableInputField locks the text input", () => {
    renderWithProviders(<NumberInput value={5} disableInputField />);

    expect(screen.getByRole("textbox")).toHaveAttribute("readonly");
    expect(screen.getByRole("button", { name: /increment/i })).not.toBeDisabled();
  });
});

describe("NumberInput: decimals", () => {
  /** Controlled, like every form field — the stepper owns no state of its own once `value` is set. */
  function Controlled(props: Partial<React.ComponentProps<typeof NumberInput>>) {
    const [value, setValue] = React.useState<number | null>(null);
    return <NumberInput value={value} onChange={setValue} {...props} />;
  }

  it('lets 8.5 be typed - the dot survives the half-typed "8." state', async () => {
    // Normalising the text through the number on every keystroke turned "8." back into "8", so
    // the next digit made it "85". An hours field could not be typed at all.
    renderWithProviders(<Controlled step={0.5} max={24} />);
    const input = screen.getByRole("textbox");

    await userEvent.type(input, "8.5");

    expect(input).toHaveValue("8.5");
  });

  it("still clamps a value over the maximum", async () => {
    renderWithProviders(<Controlled step={0.5} max={24} />);
    const input = screen.getByRole("textbox");

    await userEvent.type(input, "99");

    expect(input).toHaveValue("24");
  });

  it("steps by a fraction", async () => {
    const onChange = vi.fn();
    renderWithProviders(<NumberInput value={8} step={0.5} onChange={onChange} />);

    await userEvent.click(screen.getByRole("button", { name: /increment/i }));

    expect(onChange).toHaveBeenCalledWith(8.5);
  });

  it("asks a phone for the decimal keypad only when the step is fractional", () => {
    const { unmount } = renderWithProviders(<NumberInput value={1} step={0.5} />);
    expect(screen.getByRole("textbox")).toHaveAttribute("inputmode", "decimal");
    unmount();

    renderWithProviders(<NumberInput value={1} step={1} />);
    expect(screen.getByRole("textbox")).toHaveAttribute("inputmode", "numeric");
  });
});
