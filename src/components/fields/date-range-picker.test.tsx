import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithProviders } from "@/test/test-utils";
import { DateRangePicker, type DateRangeValue } from "./date-range-picker";
import { toDateOnly } from "@/lib/datetime";
import { subDays } from "date-fns";

const open = async () => {
  await userEvent.click(screen.getByRole("button", { name: /pick a date range/i }));
};

describe("DateRangePicker", () => {
  it("shows the placeholder until a range is set, then the formatted range", () => {
    const { rerender } = renderWithProviders(
      <DateRangePicker value={undefined} onChange={() => {}} />,
    );
    expect(screen.getByRole("button", { name: /pick a date range/i })).toBeInTheDocument();

    rerender(<DateRangePicker value={["2026-01-01", "2026-01-31"]} onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "01 Jan – 31 Jan 2026" })).toBeInTheDocument();
  });

  it("a preset commits immediately - a complete range needs no confirmation", async () => {
    const onChange = vi.fn();
    renderWithProviders(<DateRangePicker value={undefined} onChange={onChange} />);
    await open();

    await userEvent.click(screen.getByRole("button", { name: "Last 7 days" }));

    const today = new Date();
    expect(onChange).toHaveBeenCalledWith([toDateOnly(subDays(today, 6)), toDateOnly(today)]);
  });

  it("a hand-picked range does NOT commit until Apply", async () => {
    // Committing on the first click would fire a half-range fetch on every date pick.
    const onChange = vi.fn();
    renderWithProviders(
      <DateRangePicker value={["2026-01-10", "2026-01-20"]} onChange={onChange} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "10 Jan – 20 Jan 2026" }));

    // Anchored to the month: the picker shows two months, so a bare "15th, 2026" matches
    // both January and February and the query is ambiguous.
    const day = await screen.findByRole("button", { name: /January 22nd, 2026/i });
    await userEvent.click(day);
    expect(onChange).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("opens on the month the range is in, not on today's", async () => {
    // Landing on the current month puts the selection off-screen, which reads as the range
    // having been lost. The value here is deliberately far from any plausible "today".
    renderWithProviders(
      <DateRangePicker value={["2026-01-10", "2026-01-20"]} onChange={() => {}} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "10 Jan – 20 Jan 2026" }));

    expect(await screen.findByRole("button", { name: /January 15th, 2026/i })).toBeInTheDocument();
  });

  it("Clear emits undefined so the filter is dropped rather than sent empty", async () => {
    const onChange = vi.fn();
    renderWithProviders(
      <DateRangePicker value={["2026-01-01", "2026-01-31"]} onChange={onChange} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "01 Jan – 31 Jan 2026" }));

    await userEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it("Cancel closes without emitting", async () => {
    const onChange = vi.fn();
    renderWithProviders(<DateRangePicker value={undefined} onChange={onChange} />);
    await open();

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("keeps the trigger label truncated, since Button is whitespace-nowrap", () => {
    // The defect this component avoids and DatePicker had: unwrapped text inside a nowrap
    // button spills outside the border instead of clipping.
    renderWithProviders(
      <DateRangePicker value={["2025-12-28", "2026-01-03"]} onChange={() => {}} />,
    );
    const label = screen.getByText("28 Dec 2025 – 03 Jan 2026");
    expect(label).toHaveClass("truncate");
  });

  it("renders a one-sided range", () => {
    const value: DateRangeValue = ["2026-02-01", null];
    renderWithProviders(<DateRangePicker value={value} onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "01 Feb 2026 –" })).toBeInTheDocument();
  });

  it("forwards the id and aria-invalid a FormControl injects", () => {
    renderWithProviders(
      <DateRangePicker value={undefined} onChange={() => {}} id="range" aria-invalid />,
    );
    const trigger = screen.getByRole("button", { name: /pick a date range/i });
    expect(trigger).toHaveAttribute("id", "range");
    expect(trigger).toHaveAttribute("aria-invalid", "true");
  });
});
