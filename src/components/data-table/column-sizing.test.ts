import { describe, expect, it } from "vitest";

import {
  MAX_COLUMN_SIZE,
  MIN_COLUMN_SIZE,
  clampColumnSize,
  defaultColumnSize,
  reconcileSizing,
  withoutColumn,
} from "./column-sizing";

describe("defaultColumnSize", () => {
  it("uses the published kind's width", () => {
    expect(defaultColumnSize({ kind: "id" })).toBe(120);
    expect(defaultColumnSize({ kind: "date" })).toBe(140);
    expect(defaultColumnSize({ kind: "text" })).toBe(200);
  });

  it("falls back to the text width for an unlisted field", () => {
    expect(defaultColumnSize({})).toBe(200);
  });

  it("never opens narrower than the title needs", () => {
    const header = "Preventive maintenance due date";
    expect(defaultColumnSize({ header, kind: "boolean" })).toBeGreaterThan(100);
  });

  it("ignores a header that is not plain text", () => {
    expect(defaultColumnSize({ header: () => null, kind: "number" })).toBe(120);
  });

  it("lets the column's own size win, kept as declared up to the widest allowed", () => {
    expect(defaultColumnSize({ size: 333, kind: "id" })).toBe(333);
    expect(defaultColumnSize({ size: 5000 })).toBe(MAX_COLUMN_SIZE);
  });

  it("does not grow a narrow declared column to the drag minimum", () => {
    // An icon or status column declared at 40px stays 40px: the drag minimum is for widths a user
    // chose (which go to the server), not for ones a screen declares in code.
    expect(defaultColumnSize({ size: 40 })).toBe(40);
    expect(defaultColumnSize({ size: 0 })).toBe(1);
  });
});

describe("clampColumnSize", () => {
  it("keeps a width inside what a user can drag to", () => {
    expect(clampColumnSize(1)).toBe(MIN_COLUMN_SIZE);
    expect(clampColumnSize(99999)).toBe(MAX_COLUMN_SIZE);
    expect(clampColumnSize(150.4)).toBe(150);
  });
});

describe("reconcileSizing", () => {
  it("drops widths for columns that no longer exist", () => {
    expect(reconcileSizing({ name: 200, gone: 300 }, ["name", "code"])).toEqual({ name: 200 });
  });

  it("clamps stored widths and discards non-numbers", () => {
    expect(reconcileSizing({ a: 10, b: Number.NaN, c: 9999 }, ["a", "b", "c"])).toEqual({
      a: MIN_COLUMN_SIZE,
      c: MAX_COLUMN_SIZE,
    });
  });
});

describe("withoutColumn", () => {
  it("removes one column without mutating the input", () => {
    const sizing = { a: 100, b: 200 };
    expect(withoutColumn(sizing, "a")).toEqual({ b: 200 });
    expect(sizing).toEqual({ a: 100, b: 200 });
  });
});
