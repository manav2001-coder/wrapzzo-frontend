import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useTranslation } from "react-i18next";

export interface MultiLineSeries {
  key: string;
  label: string;
  color: string;
}

export interface MultiLineChartProps {
  /** One row per x-axis point: `{ label, [series.key]: number, ... }`. */
  data: Record<string, string | number>[];
  series: MultiLineSeries[];
  height?: number;
  /** Appended to every axis tick and tooltip value — `"%"` for a percentage chart. Also fixes
   *  the Y axis to `[0, 100]` for `"%"` specifically, so a percentage chart reads against a
   *  known ceiling rather than an axis that rescales to whatever the data happened to reach. */
  unit?: string;
}

/**
 * Several related counts over the same days, one legend-bearing chart — e.g. total/on-time/
 * delayed schedules per day. Distinct from `TrendLineChart` (one series, an optional
 * reference line) rather than folding a `series` prop into it: that component's whole point
 * is a single measure read against a standard, and multiplexing both shapes into one
 * component would make neither caller's intent legible at the call site.
 */
export function MultiLineChart({ data, series, height = 260, unit }: MultiLineChartProps) {
  const { t } = useTranslation("fleetAgents");
  if (data.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{t("charts.empty")}</p>;
  }
  const withUnit = (value: number | string) => `${value}${unit ?? ""}`;
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
          domain={unit === "%" ? [0, 100] : undefined}
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
          width={unit ? 44 : 36}
          allowDecimals={false}
          tickFormatter={withUnit}
        />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "var(--radius)",
            fontSize: 12,
          }}
          formatter={(value: number, name: string) => [withUnit(value), name]}
        />
        <Legend
          verticalAlign="top"
          height={28}
          formatter={(value) => <span className="text-xs text-foreground">{value}</span>}
        />
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color}
            strokeWidth={2}
            dot={{ r: 2 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
