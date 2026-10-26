import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithProviders } from "@/test/test-utils";
import { DateTimePicker } from "./date-time-picker";

function firstEnabledDayButton(): HTMLButtonElement {
  const buttons = Array.from(document.querySelectorAll("button")) as HTMLButtonElement[];
  const day = buttons.find((btn) => /^\d+$/.test(btn.textContent?.trim() ?? "") && !btn.disabled);
  if (!day) throw new Error("No enabled day button found");
  return day;
}

describe("DateTimePicker", () => {
  it("changing the time input updates the emitted Date's time-of-day", async () => {
    const onChange = vi.fn();
    renderWithProviders(<DateTimePicker value={new Date(2024, 0, 15, 9, 0)} onChange={onChange} />);

    await userEvent.click(screen.getByRole("button", { name: /january/i }));
    fireEvent.change(screen.getByDisplayValue("09:00"), { target: { value: "14:30" } });
    await userEvent.click(screen.getByRole("button", { name: /apply/i }));

    const applied: Date = onChange.mock.calls[0]![0];
    expect(applied.getHours()).toBe(14);
    expect(applied.getMinutes()).toBe(30);
  });

  it("hides the time input when dateOnly is set", async () => {
    renderWithProviders(<DateTimePicker value={null} dateOnly onChange={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: /pick a date/i }));
    await userEvent.click(firstEnabledDayButton());

    expect(screen.queryByDisplayValue(/^\d{2}:\d{2}$/)).not.toBeInTheDocument();
  });
});
