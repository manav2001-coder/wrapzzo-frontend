import { describe, expect, it } from "vitest";

import { defaultColumnAlign } from "./column-alignment";

describe("defaultColumnAlign", () => {
  it("centres cells unless the column says otherwise", () => {
    expect(defaultColumnAlign({})).toBe("center");
    expect(defaultColumnAlign({ align: "left" })).toBe("left");
    expect(defaultColumnAlign({ align: "right" })).toBe("right");
  });
});
