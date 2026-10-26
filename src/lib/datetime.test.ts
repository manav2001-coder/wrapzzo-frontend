import { describe, expect, it } from "vitest";

import {
  EMPTY,
  formatDate,
  formatDateOnly,
  formatDateTime,
  formatDateTimeWithZone,
  formatTime,
  fromDateOnly,
  listTimezones,
  toDateOnly,
  toUTC,
  tzAbbreviation,
} from "./datetime";

// A UTC instant late enough in the day that IST (+5:30) rolls it to the NEXT date —
// the case that separates "formatted in a timezone" from "formatted in UTC".
const LATE_UTC = "2024-04-12T20:30:00.000Z";

describe("formatDateTime", () => {
  it("renders a UTC instant in the requested timezone", () => {
    expect(formatDateTime(LATE_UTC, { timeZone: "UTC", locale: "en-GB" })).toContain("12 Apr 2024");
    // +5:30 pushes 20:30 UTC into the small hours of the 13th.
    expect(formatDateTime(LATE_UTC, { timeZone: "Asia/Kolkata", locale: "en-GB" })).toContain(
      "13 Apr 2024",
    );
  });

  it("uses a 24-hour clock so 02:00 and 14:00 are never confused", () => {
    expect(formatDateTime(LATE_UTC, { timeZone: "UTC", locale: "en-GB" })).toContain("20:30");
  });

  it("falls back to an em dash for null, undefined and unparseable input", () => {
    expect(formatDateTime(null)).toBe(EMPTY);
    expect(formatDateTime(undefined)).toBe(EMPTY);
    expect(formatDateTime("not a date")).toBe(EMPTY);
    expect(formatDateTime("")).toBe(EMPTY);
  });

  it("honours a custom fallback", () => {
    expect(formatDateTime(null, { fallback: "never" })).toBe("never");
  });

  it("does not throw on an unknown timezone - one bad profile must not blank a table", () => {
    expect(() => formatDateTime(LATE_UTC, { timeZone: "Asia/Atlantis" })).not.toThrow();
    expect(formatDateTime(LATE_UTC, { timeZone: "Asia/Atlantis" })).not.toBe(EMPTY);
  });
});

describe("formatDate / formatTime", () => {
  it("formats the date part in the given zone", () => {
    expect(formatDate(LATE_UTC, { timeZone: "UTC", locale: "en-GB" })).toBe("12 Apr 2024");
    expect(formatDate(LATE_UTC, { timeZone: "Asia/Kolkata", locale: "en-GB" })).toBe("13 Apr 2024");
  });

  it("formats the time part in the given zone", () => {
    expect(formatTime(LATE_UTC, { timeZone: "UTC", locale: "en-GB" })).toBe("20:30");
    expect(formatTime(LATE_UTC, { timeZone: "Asia/Kolkata", locale: "en-GB" })).toBe("02:00");
  });
});

describe("formatDateOnly", () => {
  it("NEVER shifts the day, whatever timezone is passed", () => {
    // This is the whole reason the function exists. `new Date("1990-04-12")` parses as
    // UTC midnight; rendering that in any zone behind UTC gives 11 April, which is how
    // v4's forms ended up showing a date of birth one day early.
    for (const timeZone of ["UTC", "Asia/Kolkata", "America/Los_Angeles", "Pacific/Kiritimati"]) {
      expect(formatDateOnly("1990-04-12", { timeZone, locale: "en-GB" })).toBe("12 Apr 1990");
    }
  });

  it("ignores any time part the API happens to include", () => {
    expect(formatDateOnly("1990-04-12T00:00:00.000Z", { locale: "en-GB" })).toBe("12 Apr 1990");
  });

  it("falls back for null and for a value that is not a date", () => {
    expect(formatDateOnly(null)).toBe(EMPTY);
    expect(formatDateOnly("")).toBe(EMPTY);
    expect(formatDateOnly("12/04/1990")).toBe(EMPTY);
  });
});

describe("toDateOnly", () => {
  it("uses the LOCAL calendar day the user picked, not the UTC one", () => {
    // 12 April 23:00 local. `toISOString().slice(0,10)` would give 12 or 13 depending on
    // the runner's offset; the user picked the 12th and that is what must be stored.
    expect(toDateOnly(new Date(2024, 3, 12, 23, 0, 0))).toBe("2024-04-12");
    expect(toDateOnly(new Date(2024, 3, 12, 0, 30, 0))).toBe("2024-04-12");
  });

  it("zero-pads month and day", () => {
    expect(toDateOnly(new Date(2024, 0, 5))).toBe("2024-01-05");
  });

  it("returns null for nothing and for an invalid Date", () => {
    expect(toDateOnly(null)).toBeNull();
    expect(toDateOnly(undefined)).toBeNull();
    expect(toDateOnly(new Date("nope"))).toBeNull();
  });
});

describe("fromDateOnly", () => {
  it("round-trips with toDateOnly", () => {
    expect(toDateOnly(fromDateOnly("2024-04-12"))).toBe("2024-04-12");
  });

  it("produces a LOCAL date, so the picker highlights the day that was stored", () => {
    const date = fromDateOnly("2024-04-12")!;
    expect(date.getFullYear()).toBe(2024);
    expect(date.getMonth()).toBe(3);
    expect(date.getDate()).toBe(12);
  });

  it("returns undefined for empty or malformed input", () => {
    expect(fromDateOnly(null)).toBeUndefined();
    expect(fromDateOnly("nope")).toBeUndefined();
  });
});

describe("toUTC", () => {
  it("serialises an instant as the ISO string the API stores", () => {
    expect(toUTC(new Date(Date.UTC(2024, 3, 12, 20, 30)))).toBe("2024-04-12T20:30:00.000Z");
  });

  it("returns null for nothing and for an invalid Date", () => {
    expect(toUTC(null)).toBeNull();
    expect(toUTC(new Date("nope"))).toBeNull();
  });
});

describe("tzAbbreviation", () => {
  it("gives a short name for a zone", () => {
    expect(tzAbbreviation("Asia/Kolkata")).toMatch(/IST|GMT\+5:30/);
    expect(tzAbbreviation("UTC")).toBe("UTC");
  });

  it("falls back rather than throwing on an unknown zone", () => {
    expect(() => tzAbbreviation("Asia/Atlantis")).not.toThrow();
  });
});

describe("listTimezones", () => {
  it("always offers the canonical Asia/Kolkata, even where the runtime lists Asia/Calcutta", () => {
    // The seeded default is `Asia/Kolkata`. Runtimes that enumerate only the legacy
    // `Asia/Calcutta` would leave that stored value with no matching option, and the
    // Select renders blank — so the picker shows no timezone and any edit silently
    // overwrites the user's.
    expect(listTimezones()).toContain("Asia/Kolkata");
    expect(listTimezones()).toContain("UTC");
  });

  it("includes a caller-supplied zone the runtime does not enumerate", () => {
    expect(listTimezones("Asia/Calcutta")).toContain("Asia/Calcutta");
  });

  it("does not duplicate a zone the runtime already lists", () => {
    const zones = listTimezones("UTC");
    expect(zones.filter((zone) => zone === "UTC")).toHaveLength(1);
  });

  it("offers real IANA zones the formatters accept", () => {
    const zones = listTimezones();
    expect(zones.length).toBeGreaterThan(0);
    // Every entry must actually be usable, or the settings picker can save a value
    // that then fails to format.
    for (const zone of zones.slice(0, 25)) {
      expect(() => new Intl.DateTimeFormat("en", { timeZone: zone })).not.toThrow();
    }
  });
});

describe("formatDateTimeWithZone", () => {
  // The Battery screens’ "Created on": date, 12-hour time WITH seconds, and the zone’s name,
  // so a reader can tell which clock it is without opening Settings.
  const INSTANT = "2026-10-05T11:22:13.245Z";

  it("renders the ticket's example exactly: 05-Oct-2026 04:52:13 PM IST", () => {
    expect(formatDateTimeWithZone(INSTANT, { timeZone: "Asia/Kolkata" })).toBe(
      "05-Oct-2026 04:52:13 PM IST",
    );
  });

  it("converts to the zone it is given and names that zone", () => {
    expect(formatDateTimeWithZone(INSTANT, { timeZone: "UTC" })).toBe(
      "05-Oct-2026 11:22:13 AM UTC",
    );
    expect(formatDateTimeWithZone(INSTANT, { timeZone: "America/New_York" })).toBe(
      "05-Oct-2026 07:22:13 AM EDT",
    );
  });

  it("moves to the next DAY when the zone is far enough ahead", () => {
    // 11:22 UTC is 00:22 on the 6th in Auckland (UTC+13).
    expect(formatDateTimeWithZone(INSTANT, { timeZone: "Pacific/Auckland" })).toMatch(
      /^06-Oct-2026 12:22:13 AM /,
    );
  });

  it("zero-pads the hour and shows midnight and noon as 12", () => {
    expect(formatDateTimeWithZone("2026-01-02T00:05:09Z", { timeZone: "UTC" })).toBe(
      "02-Jan-2026 12:05:09 AM UTC",
    );
    expect(formatDateTimeWithZone("2026-01-02T12:00:00Z", { timeZone: "UTC" })).toBe(
      "02-Jan-2026 12:00:00 PM UTC",
    );
    expect(formatDateTimeWithZone("2026-01-02T01:00:00Z", { timeZone: "UTC" })).toMatch(
      /^02-Jan-2026 01:00:00 AM/,
    );
  });

  it("spells September 'Sep', not a locale's 'Sept'", () => {
    expect(formatDateTimeWithZone("2026-09-01T10:00:00Z", { timeZone: "UTC" })).toMatch(
      /^01-Sep-2026 /,
    );
  });

  it("falls back for a missing or unparseable value, and survives an unknown zone", () => {
    expect(formatDateTimeWithZone(null)).toBe(EMPTY);
    expect(formatDateTimeWithZone("not a date")).toBe(EMPTY);
    expect(formatDateTimeWithZone(undefined, { fallback: "n/a" })).toBe("n/a");
    expect(() => formatDateTimeWithZone(INSTANT, { timeZone: "Not/AZone" })).not.toThrow();
  });
});
