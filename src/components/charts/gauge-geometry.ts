/**
 * The ring and its label for a gauge `size` px wide: a ring as thick as ~9% of the gauge (6-10
 * px), drawn edge to edge in pixels (no chart margins), and a label no wider than the hole —
 * 0.16x the size, smaller when the text would not fit (a three-digit "100%").
 */
export function gaugeGeometry(size: number, label: string) {
  const outer = size / 2 - 1;
  const bar = Math.max(6, Math.min(10, Math.round(size * 0.09)));
  const inner = outer - bar;
  // A semibold tabular digit is about 0.62em wide; keep a gap of ~15% of the hole each side.
  const fits = (inner * 2 * 0.7) / (label.length * 0.62);
  return { outer, inner, bar, fontSize: Math.floor(Math.min(size * 0.16, fits)) };
}
