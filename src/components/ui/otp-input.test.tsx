import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { OtpInput } from "./otp-input";

function Harness({ onComplete }: { onComplete?: (v: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <OtpInput
      value={value}
      onChange={setValue}
      onComplete={onComplete}
      aria-label="Code"
      digitLabel={(i, n) => `Digit ${i} of ${n}`}
    />
  );
}

const box = (n: number) => screen.getByLabelText(`Digit ${n} of 6`);

describe("OtpInput", () => {
  it("renders one named box per digit inside a labelled group", () => {
    render(<Harness />);
    expect(screen.getByRole("group", { name: "Code" })).toBeInTheDocument();
    expect(screen.getAllByRole("textbox")).toHaveLength(6);
  });

  it("advances as you type and reports completion once", async () => {
    const onComplete = vi.fn();
    render(<Harness onComplete={onComplete} />);

    await userEvent.type(box(1), "123456");

    expect(box(1)).toHaveValue("1");
    expect(box(6)).toHaveValue("6");
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith("123456");
  });

  it("ignores anything that is not a digit", async () => {
    render(<Harness />);
    await userEvent.type(box(1), "1a2-3");
    expect(box(1)).toHaveValue("1");
    expect(box(2)).toHaveValue("2");
    expect(box(3)).toHaveValue("3");
    expect(box(4)).toHaveValue("");
  });

  it("spreads a pasted code across the boxes, dropping what does not fit", async () => {
    const onComplete = vi.fn();
    render(<Harness onComplete={onComplete} />);

    await userEvent.click(box(1));
    await userEvent.paste("12 34 56 78");

    expect(box(6)).toHaveValue("6");
    expect(onComplete).toHaveBeenCalledWith("123456");
  });

  it("steps back and clears on Backspace from an empty box", async () => {
    render(<Harness />);
    await userEvent.type(box(1), "12");
    expect(box(2)).toHaveValue("2");

    await userEvent.keyboard("{Backspace}");
    expect(box(2)).toHaveValue("");

    await userEvent.keyboard("{Backspace}");
    expect(box(1)).toHaveValue("");
    expect(box(1)).toHaveFocus();
  });

  it("moves with the arrow keys", async () => {
    render(<Harness />);
    await userEvent.click(box(3));
    await userEvent.keyboard("{ArrowLeft}");
    expect(box(2)).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}{ArrowRight}");
    expect(box(4)).toHaveFocus();
  });

  it("offers the platform's one-time-code autofill on the first box only", () => {
    render(<Harness />);
    expect(box(1)).toHaveAttribute("autocomplete", "one-time-code");
    expect(box(2)).toHaveAttribute("autocomplete", "off");
  });
});
