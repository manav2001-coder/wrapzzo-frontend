import { describe, expect, it } from "vitest";

import { formatDateRangeLabel } from "./format-date-range";

describe("formatDateRangeLabel", () => {
  it("drops the repeated year when both ends share it", () => {
    expect(formatDateRangeLabel("2026-01-01", "2026-01-31")).toBe("01 Jan – 31 Jan 2026");
  });

  it("keeps both years when the range crosses one", () => {
    expect(formatDateRangeLabel("2025-12-28", "2026-01-03")).toBe("28 Dec 2025 – 03 Jan 2026");
  });

  it("renders a one-sided range, which the server degrades to gte/lte", () => {
    expect(formatDateRangeLabel("2026-02-01", null)).toBe("01 Feb 2026 –");
    expect(formatDateRangeLabel(null, "2026-02-01")).toBe("– 01 Feb 2026");
  });

  it("is null when there is nothing to show, so the caller renders its placeholder", () => {
    expect(formatDateRangeLabel(null, null)).toBeNull();
    expect(formatDateRangeLabel(undefined, undefined)).toBeNull();
    expect(formatDateRangeLabel("", "")).toBeNull();
  });

  it("reads the date's own parts rather than UTC-parsing it", () => {
    // `new Date("2026-03-01")` is UTC midnight, which is 29 Feb / 28 Feb local anywhere west
    // of Greenwich — the day-shift `fromDateOnly` exists to avoid. The label must name the
    // day the user picked whatever the runner's timezone is.
    expect(formatDateRangeLabel("2026-03-01", "2026-03-01")).toBe("01 Mar – 01 Mar 2026");
  });
});
