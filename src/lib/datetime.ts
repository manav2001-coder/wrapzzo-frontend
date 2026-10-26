/**
 * Timezone-aware date/time formatting.
 *
 * The contract, which the whole app obeys uniformly:
 *
 *   - Instants (`created_at`, `updated_at`, audit timestamps) are stored in UTC and
 *     RENDERED in the viewer's timezone.
 *   - Date-only values (date of birth, effective from/to) are NEVER converted. They are
 *     plain `YYYY-MM-DD` strings with no time and no zone, and putting them through a
 *     timezone conversion shifts them by a day — v4 does this correctly in its tables
 *     and incorrectly in its forms, which is why its frontend had to special-case DOB.
 *     `formatDateOnly` cannot convert, because it never builds a `Date` from the string.
 *
 * Implemented on `Intl.DateTimeFormat`, which has a full IANA tz database built in. v4
 * needed dayjs plus its utc and timezone plugins for the same thing; there is no reason
 * to ship three dependencies for what the platform already does.
 */

/** What v4 shows for an absent value, and what the tables here show too. */
export const EMPTY = "-";

export type DateInput = string | number | Date | null | undefined;

function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** The browser's own zone — the fallback when a user has no preference yet. */
export function browserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

/**
 * `Intl` throws a RangeError on an unknown zone, which would blank an entire table over
 * one bad profile value. Fall back to the browser's zone instead.
 */
function safeZone(timeZone: string | undefined): string {
  if (!timeZone) return browserTimezone();
  try {
    new Intl.DateTimeFormat("en", { timeZone });
    return timeZone;
  } catch {
    return browserTimezone();
  }
}

export interface FormatOptions {
  timeZone?: string;
  locale?: string;
  /** Rendered when the value is null/undefined/unparseable. Defaults to an em dash. */
  fallback?: string;
}

/** `12 Apr 2024` in the given zone. */
export function formatDate(value: DateInput, options: FormatOptions = {}): string {
  const date = toDate(value);
  if (!date) return options.fallback ?? EMPTY;
  return new Intl.DateTimeFormat(options.locale, {
    timeZone: safeZone(options.timeZone),
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

/** `12 Apr 2024, 14:35` in the given zone. */
export function formatDateTime(value: DateInput, options: FormatOptions = {}): string {
  const date = toDate(value);
  if (!date) return options.fallback ?? EMPTY;
  return new Intl.DateTimeFormat(options.locale, {
    timeZone: safeZone(options.timeZone),
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

/**
 * `05-Oct-2026 04:52:13 PM IST` — the date, a 12-hour clock WITH seconds, and the zone’s own
 * name, in the given zone.
 *
 * For a record’s "Created on", where the reader has to be able to tell WHICH clock they are
 * looking at without opening Settings. Built from `formatToParts` rather than a locale’s pattern,
 * because the order and punctuation are the requirement (`en-US` would give "Oct 5, 2026, 4:52
 * PM"), and month names come out English (`Sep`, never a locale’s `Sept`).
 *
 * The zone name is the short name Intl gives in English ("EDT", "UTC"). Most zones have none —
 * Intl answers "GMT+5:30" — so for those the Indian-English name is tried, which is the one
 * place "IST" exists. A zone neither can name keeps its "GMT+13" offset, which is still exact.
 */
export function formatDateTimeWithZone(value: DateInput, options: FormatOptions = {}): string {
  const date = toDate(value);
  if (!date) return options.fallback ?? EMPTY;
  const timeZone = safeZone(options.timeZone);

  const parts = (locale: string, extra: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, { timeZone, ...extra }).formatToParts(date);
  const pick = (list: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) =>
    list.find((part) => part.type === type)?.value ?? "";

  const main = parts("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const zoneName = (locale: string) =>
    pick(parts(locale, { timeZoneName: "short" }), "timeZoneName");
  let zone = zoneName("en-US");
  if (zone.startsWith("GMT")) {
    const indian = zoneName("en-IN");
    if (indian && !indian.startsWith("GMT")) zone = indian;
  }

  const day = `${pick(main, "day")}-${pick(main, "month")}-${pick(main, "year")}`;
  const clock = `${pick(main, "hour")}:${pick(main, "minute")}:${pick(main, "second")}`;
  return `${day} ${clock} ${pick(main, "dayPeriod")} ${zone}`.trim();
}

/** `14:35` in the given zone. */
export function formatTime(value: DateInput, options: FormatOptions = {}): string {
  const date = toDate(value);
  if (!date) return options.fallback ?? EMPTY;
  return new Intl.DateTimeFormat(options.locale, {
    timeZone: safeZone(options.timeZone),
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

/**
 * A date-only `YYYY-MM-DD` value, formatted WITHOUT any timezone conversion.
 *
 * The parts are read straight off the string. `new Date("1990-04-12")` would parse it as
 * UTC midnight, and rendering that in a zone behind UTC gives 11 April — the day-shift
 * bug this function exists to make impossible.
 */
export function formatDateOnly(
  value: string | null | undefined,
  options: FormatOptions = {},
): string {
  if (!value) return options.fallback ?? EMPTY;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return options.fallback ?? EMPTY;
  const [, year, month, day] = match;
  // UTC in, UTC out: the zone cancels, so only the numbers in the string survive.
  const asUtc = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return new Intl.DateTimeFormat(options.locale, {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(asUtc);
}

/**
 * A `Date` from a date picker turned into the `YYYY-MM-DD` a date-only field stores.
 *
 * Uses the LOCAL components deliberately: the user picked "12 April" on a calendar
 * showing their own dates, so `toISOString().slice(0, 10)` — which converts to UTC
 * first — would store 11 April for anyone west of Greenwich, and for anyone east of it
 * whenever the picked time is late in the day.
 */
export function toDateOnly(value: Date | null | undefined): string | null {
  if (!value || Number.isNaN(value.getTime())) return null;
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${value.getFullYear()}-${month}-${day}`;
}

/** A stored `YYYY-MM-DD` back into the local `Date` a date picker expects. */
export function fromDateOnly(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return undefined;
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

/** An instant as the UTC ISO string the API stores. */
export function toUTC(value: Date | null | undefined): string | null {
  if (!value || Number.isNaN(value.getTime())) return null;
  return value.toISOString();
}

/**
 * The short zone name for a timezone — `IST`, `GMT+5:30`, … Shown next to timestamps so
 * a reader knows which clock they are looking at.
 *
 * `Intl` returns a real abbreviation where the locale data has one and a `GMT+X` offset
 * otherwise; both are correct to display, so there is no hand-kept abbreviation table to
 * drift out of date (v4 kept one).
 */
export function tzAbbreviation(timeZone: string | undefined, at: Date = new Date()): string {
  const zone = safeZone(timeZone);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    timeZoneName: "short",
  }).formatToParts(at);
  return parts.find((part) => part.type === "timeZoneName")?.value ?? zone;
}

/**
 * Zones that must appear in the picker whatever the runtime reports.
 *
 * `Intl.supportedValuesOf("timeZone")` is not guaranteed to use the name we store: some
 * runtimes still list the LEGACY `Asia/Calcutta` rather than the canonical
 * `Asia/Kolkata`, which is the default this app seeds. A stored value missing from the
 * option list renders the Select blank — the user sees no timezone at all and any edit
 * silently overwrites theirs.
 */
const ALWAYS_OFFERED = ["UTC", "Asia/Kolkata"];

/**
 * Every IANA zone the runtime knows, for the settings picker.
 *
 * `Intl.supportedValuesOf` is ES2022 and present in every browser this app targets, but
 * not in older jsdom — hence the fallback list covering India plus the common business
 * zones. `include` adds the caller's current value, so a profile holding a zone this
 * runtime does not enumerate still shows up selected instead of blank.
 */
export function listTimezones(include?: string | null): string[] {
  const supported = (Intl as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf;
  let zones: string[] = [];
  if (typeof supported === "function") {
    try {
      zones = supported("timeZone");
    } catch {
      // fall through to the static list
    }
  }
  if (zones.length === 0) {
    zones = [
      "Asia/Kolkata",
      "Asia/Dubai",
      "Asia/Singapore",
      "Australia/Sydney",
      "Europe/London",
      "Europe/Berlin",
      "America/New_York",
      "America/Los_Angeles",
      "UTC",
    ];
  }

  // A Set, not a filter-per-extra: `include` can repeat one of ALWAYS_OFFERED, and a
  // duplicated option makes React's key warning fire and the Select misbehave.
  const known = new Set(zones);
  const extras = [...ALWAYS_OFFERED, include].filter((zone): zone is string => {
    if (!zone || known.has(zone)) return false;
    known.add(zone);
    return true;
  });
  return extras.length > 0 ? [...extras, ...zones].sort() : zones;
}
