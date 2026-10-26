import { RadialBar, RadialBarChart, ResponsiveContainer } from "recharts";

import { gaugeGeometry } from "./gauge-geometry";

export interface HealthGaugeProps {
  /** 0-100. */
  value: number;
  size?: number;
  /**
   * Status thresholds, matching `FleetKpiRow`'s own convention (§6.2): success at/above
   * `goodAt`, warning below `warnBelow`, destructive below that.
   */
  goodAt?: number;
  warnBelow?: number;
  /** A small caption under the percentage, e.g. "Available" — omit for a bare number. */
  caption?: string;
}

function colorFor(value: number, goodAt: number, warnBelow: number): string {
  if (value >= goodAt) return "hsl(var(--success))";
  if (value >= warnBelow) return "hsl(var(--warning))";
  return "hsl(var(--destructive))";
}

/**
 * A 0-100 radial gauge (`recharts` `RadialBarChart`) — used for the AI Command chat's
 * `chart.type === "gauge"` answers (e.g. current fleet availability) and reusable for any
 * later single 0-100 score (battery health, tyre wear index).
 */
export function HealthGauge({
  value,
  size = 160,
  goodAt = 90,
  warnBelow = 75,
  caption,
}: HealthGaugeProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const color = colorFor(clamped, goodAt, warnBelow);
  const data = [{ name: "value", value: clamped, fill: color }];
  const { outer, inner, bar, fontSize } = gaugeGeometry(size, `${Math.round(clamped)}%`);

  return (
    // `shrink-0`: a fixed-size gauge beside text in a flex row must not be squeezed narrower
    // than it is tall — its ring is drawn in pixels, so a squeezed box crops it sideways.
    <div style={{ width: size, height: size }} className="relative shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          data={data}
          startAngle={90}
          endAngle={-270}
          innerRadius={inner}
          outerRadius={outer}
          barSize={bar}
          margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        >
          <RadialBar dataKey="value" cornerRadius={4} background={{ fill: "hsl(var(--muted))" }} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Sized by `gaugeGeometry` to fit inside the ring's hole at every size — at 72px a
            "100%" at the old 0.16x touched the ring once recharts' own margins shrank it. */}
        <div className="flex flex-col items-center">
          <span className="font-semibold leading-none tabular-nums" style={{ color, fontSize }}>
            {Math.round(clamped)}%
          </span>
          {caption && (
            <span
              className="mt-1 font-semibold uppercase leading-none tracking-wider text-muted-foreground"
              style={{ fontSize: Math.max(8, Math.round(size * 0.065)) }}
            >
              {caption}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
