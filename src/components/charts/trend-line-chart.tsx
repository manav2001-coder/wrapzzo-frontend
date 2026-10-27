import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useTranslation } from "react-i18next";

export interface TrendLineChartPoint {
  label: string;
  value: number;
}

export interface TrendLineChartProps {
  data: TrendLineChartPoint[];
  /** CSS color, e.g. `hsl(var(--primary))` — defaults to the theme's primary token. */
  color?: string;
  height?: number;
  /**
   * A horizontal STANDARD to read the series against — the fuel mileage history draws each
   * fill's mileage against the vehicle's expected figure. A reference line on the one axis,
   * not a second series, which keeps the `dataviz` rule this component was built to.
   */
  reference?: { value: number; label: string };
}

/**
 * A thin `recharts` `LineChart` wrapper — one series, one axis, per the `dataviz` skill's
 * non-negotiables (never a dual-axis chart). Reserved for docs `02`+; doc 01 itself has no
 * KPI history yet (§11 non-goal), so this renders only when the AI Command chat's answer
 * names `chart.type === "line"`, which is rare in Phase 1.
 */
export function TrendLineChart({
  data,
  color = "hsl(var(--primary))",
  height = 200,
  reference,
}: TrendLineChartProps) {
  const { t } = useTranslation();
  if (data.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{t("charts.empty")}</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          axisLine={{ stroke: "hsl(var(--border))" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
          width={36}
        />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "var(--radius)",
            fontSize: 12,
          }}
        />
        {reference ? (
          <ReferenceLine
            y={reference.value}
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="4 4"
            label={{
              value: reference.label,
              position: "insideTopRight",
              fontSize: 11,
              fill: "hsl(var(--muted-foreground))",
            }}
          />
        ) : null}
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
