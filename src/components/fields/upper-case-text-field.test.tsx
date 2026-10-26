import * as React from "react";
import { describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";

import { render, screen } from "@/test/test-utils";
import { UpperCaseTextField } from "./upper-case-text-field";

function Controlled({ initial = "" }: { initial?: string }) {
  const [value, setValue] = React.useState(initial);
  return <UpperCaseTextField aria-label="code" value={value} onChange={setValue} />;
}

describe("UpperCaseTextField", () => {
  it("upper-cases what is typed", async () => {
    const user = userEvent.setup();
    render(<Controlled />);

    await user.type(screen.getByLabelText("code"), "bus-042");

    expect(screen.getByLabelText("code")).toHaveValue("BUS-042");
  });

  it("keeps the caret where the letter was typed, not at the end", async () => {
    const user = userEvent.setup();
    render(<Controlled initial="BUS-42" />);
    const input = screen.getByLabelText("code") as HTMLInputElement;

    // Between "BUS-" and "42".
    await user.type(input, "x", { initialSelectionStart: 4, initialSelectionEnd: 4 });

    expect(input).toHaveValue("BUS-X42");
    expect(input.selectionStart).toBe(5);
    expect(input.selectionEnd).toBe(5);
  });
});
