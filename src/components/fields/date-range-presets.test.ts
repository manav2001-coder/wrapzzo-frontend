import { describe, expect, it } from "vitest";

import en from "@/locales/en/common.json";
import hi from "@/locales/hi/common.json";
import { DATE_RANGE_PRESETS, DATE_RANGE_PRESET_KEYS } from "./date-range-presets";
import { toDateOnly } from "@/lib/datetime";

const CATALOGS = { en, hi } as const;

/** A fixed Wednesday mid-month, so month and week boundaries are both interesting. */
const TODAY = new Date(2026, 4, 20); // 20 May 2026

const range = (key: string) => {
  const preset = DATE_RANGE_PRESETS.find((entry) => entry.key === key);
  if (!preset) throw new Error(`no preset ${key}`);
  const [from, to] = preset.range(TODAY);
  return [toDateOnly(from), toDateOnly(to)];
};

describe("date range presets", () => {
  it("today is a single day", () => {
    expect(range("today")).toEqual(["2026-05-20", "2026-05-20"]);
  });

  it("last 7 days spans 7 calendar days INCLUDING today, not 8", () => {
    // Off-by-one here is the classic: subDays(today, 7) gives an 8-day span.
    expect(range("last7Days")).toEqual(["2026-05-14", "2026-05-20"]);
  });

  it("last 30 days likewise includes today", () => {
    expect(range("last30Days")).toEqual(["2026-04-21", "2026-05-20"]);
  });

  it("this month runs from the 1st to today, not to the month end", () => {
    // Ending at the month end would select future days, which no list can match.
    expect(range("thisMonth")).toEqual(["2026-05-01", "2026-05-20"]);
  });

  it("last month is the whole previous month", () => {
    expect(range("lastMonth")).toEqual(["2026-04-01", "2026-04-30"]);
  });

  it("crosses a year boundary correctly", () => {
    const preset = DATE_RANGE_PRESETS.find((entry) => entry.key === "lastMonth")!;
    const [from, to] = preset.range(new Date(2026, 0, 15)); // 15 Jan 2026
    expect([toDateOnly(from), toDateOnly(to)]).toEqual(["2025-12-01", "2025-12-31"]);
  });
});

/**
 * The preset labels are built at runtime — ``t(`dateRange.presets.${key}`)`` — so
 * `i18n-keys.test.ts` cannot see them; it scans for literal `t("…")` strings. A typo'd key
 * would render the raw key on screen with every other test green.
 */
describe("preset label keys resolve in every locale", () => {
  for (const [locale, catalog] of Object.entries(CATALOGS)) {
    // The catalogs are typed from the JSON itself, so this reads through a structural view
    // rather than a cast — a cast would intersect with the literal type and fight it.
    const block: { placeholder?: string; presets?: Record<string, string> } = (
      catalog as Record<string, unknown>
    ).dateRange as never;

    it(`${locale} has a label for every preset, plus the placeholder`, () => {
      expect(block?.placeholder, `${locale}: dateRange.placeholder`).toBeTruthy();
      for (const key of DATE_RANGE_PRESET_KEYS) {
        expect(block?.presets?.[key], `${locale}: dateRange.presets.${key}`).toBeTruthy();
      }
    });

    it(`${locale} has no orphan preset label`, () => {
      expect(Object.keys(block?.presets ?? {}).sort()).toEqual([...DATE_RANGE_PRESET_KEYS].sort());
    });
  }
});
