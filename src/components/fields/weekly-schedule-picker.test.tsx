import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithProviders } from "@/test/test-utils";
import { WeeklySchedulePicker } from "./weekly-schedule-picker";

describe("WeeklySchedulePicker", () => {
  it("adds a day to value when its chip is clicked", async () => {
    const onChange = vi.fn();
    renderWithProviders(<WeeklySchedulePicker value={[]} onChange={onChange} />);

    await userEvent.click(screen.getByRole("checkbox", { name: "Mon" }));
    expect(onChange).toHaveBeenCalledWith([{ day: "Mon", start: "09:00", end: "17:00" }]);
  });

  it("removes a day when its chip is clicked again", async () => {
    const onChange = vi.fn();
    renderWithProviders(
      <WeeklySchedulePicker
        value={[{ day: "Mon", start: "09:00", end: "17:00" }]}
        onChange={onChange}
      />,
    );

    await userEvent.click(screen.getByRole("checkbox", { name: "Mon" }));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("updates only the edited day's time entry", async () => {
    const onChange = vi.fn();
    renderWithProviders(
      <WeeklySchedulePicker
        value={[
          { day: "Mon", start: "09:00", end: "17:00" },
          { day: "Tue", start: "09:00", end: "17:00" },
        ]}
        onChange={onChange}
      />,
    );

    const timeInputs = screen.getAllByDisplayValue("09:00");
    fireEvent.change(timeInputs[0]!, { target: { value: "10:00" } });

    const lastCall = onChange.mock.calls.at(-1)?.[0];
    expect(lastCall.find((e: { day: string }) => e.day === "Tue").start).toBe("09:00");
  });
});
