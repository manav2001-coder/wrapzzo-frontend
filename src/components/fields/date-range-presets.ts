import { startOfMonth, endOfMonth, subDays, subMonths } from "date-fns";

/**
 * The quick ranges offered beside the calendars.
 *
 * `key` is an i18n key fragment, not a label — the component resolves
 * ``t(`dateRange.presets.${key}`)``. Keys built at runtime are invisible to
 * `i18n-keys.test.ts`, so `date-range-presets.test.ts` enumerates them and asserts all three
 * locales resolve, the way `pages/landing/content.test.ts` does for the landing copy.
 *
 * Every range is computed from an injected `today` rather than `new Date()` so the boundary
 * arithmetic is testable without freezing the clock — and both ends are whole local days,
 * because these feed `toDateOnly`, which reads LOCAL components. Going through UTC here would
 * shift the boundary a day for anyone west of Greenwich.
 */
export interface DateRangePreset {
  key: string;
  range: (today: Date) => [Date, Date];
}

export const DATE_RANGE_PRESETS: readonly DateRangePreset[] = [
  { key: "today", range: (today) => [today, today] },
  // Inclusive of today, so "last 7 days" spans 7 calendar days, not 8.
  { key: "last7Days", range: (today) => [subDays(today, 6), today] },
  { key: "last30Days", range: (today) => [subDays(today, 29), today] },
  { key: "thisMonth", range: (today) => [startOfMonth(today), today] },
  {
    key: "lastMonth",
    range: (today) => {
      const previous = subMonths(today, 1);
      return [startOfMonth(previous), endOfMonth(previous)];
    },
  },
] as const;

export const DATE_RANGE_PRESET_KEYS = DATE_RANGE_PRESETS.map((preset) => preset.key);
