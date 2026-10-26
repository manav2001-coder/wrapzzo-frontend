import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithProviders } from "@/test/test-utils";
import { DatePicker } from "./date-picker";

function firstEnabledDayButton(): HTMLButtonElement {
  const buttons = Array.from(document.querySelectorAll("button")) as HTMLButtonElement[];
  const day = buttons.find((btn) => /^\d+$/.test(btn.textContent?.trim() ?? "") && !btn.disabled);
  if (!day) throw new Error("No enabled day button found");
  return day;
}

describe("DatePicker", () => {
  it("selecting a day and applying calls onChange(Date) and onChangeUTC(isoString)", async () => {
    const onChange = vi.fn();
    const onChangeUTC = vi.fn();
    renderWithProviders(<DatePicker value={null} onChange={onChange} onChangeUTC={onChangeUTC} />);

    await userEvent.click(screen.getByRole("button", { name: /pick a date/i }));
    await userEvent.click(firstEnabledDayButton());
    await userEvent.click(screen.getByRole("button", { name: /apply/i }));

    expect(onChange).toHaveBeenCalledWith(expect.any(Date));
    expect(onChangeUTC).toHaveBeenCalledWith(expect.any(String));
  });

  it("Clear resets to null", async () => {
    const onChange = vi.fn();
    renderWithProviders(<DatePicker value={new Date(2024, 0, 15)} onChange={onChange} />);

    await userEvent.click(screen.getByRole("button", { name: /january/i }));
    await userEvent.click(screen.getByRole("button", { name: /clear/i }));

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("Cancel closes without committing a pending selection", async () => {
    const onChange = vi.fn();
    renderWithProviders(<DatePicker value={null} onChange={onChange} />);

    await userEvent.click(screen.getByRole("button", { name: /pick a date/i }));
    await userEvent.click(firstEnabledDayButton());
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onChange).not.toHaveBeenCalled();
  });
});

/**
 * The month/year dropdowns.
 *
 * Without them, reaching a date of birth meant clicking the back arrow once per month.
 * The bounds are the load-bearing half: `captionLayout="dropdown"` with no explicit
 * `endMonth` makes react-day-picker stop at the END OF THE CURRENT YEAR, which is right
 * for a date of birth and silently wrong for every expiry this app stores.
 */
describe("DatePicker month/year dropdowns", () => {
  function yearOptions(): number[] {
    const selects = Array.from(document.querySelectorAll("select")) as HTMLSelectElement[];
    // Two dropdowns: months (12 options) and years (many). Pick the year one by size.
    const years = selects.find((el) => el.options.length > 12);
    if (!years) throw new Error("No year dropdown rendered");
    return Array.from(years.options).map((o) => Number(o.value));
  }

  it("offers a year dropdown reaching a century back, so a date of birth is one click away", async () => {
    renderWithProviders(<DatePicker value={null} />);
    await userEvent.click(screen.getByRole("button", { name: /pick a date/i }));

    const years = yearOptions();
    const thisYear = new Date().getFullYear();
    expect(Math.min(...years)).toBe(thisYear - 100);
  });

  it("stops at `toDate`'s year, so a past-only field offers no future years", async () => {
    // What `dateField({ future: false })` passes for a date of birth or an issue date.
    renderWithProviders(<DatePicker value={null} toDate={new Date()} />);
    await userEvent.click(screen.getByRole("button", { name: /pick a date/i }));

    const thisYear = new Date().getFullYear();
    expect(Math.max(...yearOptions())).toBe(thisYear);
  });

  it("reaches decades FORWARD when no `toDate` bounds it", async () => {
    // The regression this guards: react-day-picker's own default would cap an unbounded
    // dropdown at the current year, leaving an RC or insurance expiry unreachable.
    renderWithProviders(<DatePicker value={null} />);
    await userEvent.click(screen.getByRole("button", { name: /pick a date/i }));

    const thisYear = new Date().getFullYear();
    expect(Math.max(...yearOptions())).toBeGreaterThan(thisYear);
  });
});
