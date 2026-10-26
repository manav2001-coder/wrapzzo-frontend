import { describe, expect, it } from "vitest";

import { gaugeGeometry } from "./gauge-geometry";

/** Roughly how wide the label renders: a semibold tabular digit is about 0.62em. */
const labelWidth = (label: string, fontSize: number) => label.length * 0.62 * fontSize;

describe("gaugeGeometry", () => {
  it.each([72, 76, 84, 96, 104, 160])(
    "keeps even a 100%% label inside the ring at %ipx",
    (size) => {
      for (const label of ["0%", "39%", "100%"]) {
        const { inner, fontSize } = gaugeGeometry(size, label);
        expect(labelWidth(label, fontSize)).toBeLessThan(inner * 2);
      }
    },
  );

  it("draws the ring 6-10px thick, and keeps the old 24px text at 160px", () => {
    expect(gaugeGeometry(72, "50%").bar).toBe(6);
    expect(gaugeGeometry(160, "50%")).toMatchObject({ bar: 10, fontSize: 25 });
  });
});
