import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useTranslation } from "react-i18next";

export interface MiniBarChartDatum {
  label: string;
  value: number;
  /** CSS color for this one bar — e.g. status coloring for a severity breakdown. Omit for
   *  a single-hue categorical chart (the dataviz skill's default when bars share one job). */
  color?: string;
}

export interface MiniBarChartProps {
  data: MiniBarChartDatum[];
  height?: number;
  /**
   * What the tooltip calls the single measure being plotted — "Pending", "Extra Schedules".
   * `recharts`' own default tooltip falls back to the `<Bar>`'s bare `dataKey` ("value") when
   * no `name` is given, which is what rendered every tooltip here as the literal
   * `value : 3` PMPML's own dashboard never shows (it always names the series, e.g.
   * `Total Schedules: 2,462`). Optional because the AI chat's dynamic bar-chart answers
   * (`fleet-command/maria/maria-reply.tsx`) have no single fixed metric name to give it.
   */
  seriesName?: string;
  /** Shown instead of the chart when there are no bars. */
  emptyText?: string;
  /** Makes each bar a drill-down. */
  onSelect?: (datum: MiniBarChartDatum) => void;
}

/**
 * A small `recharts` `BarChart` — one measure across categories, one axis, per the
 * `dataviz` skill. Used for `AiInsightsList`'s category breakdown, the Command Center's
 * "Fleet status" operational view (§6.5), and the chat's `chart.type === "bar"` answers.
 */
export function MiniBarChart({ data, height = 200, seriesName, emptyText, onSelect }: MiniBarChartProps) {
  const { t } = useTranslation();
  if (data.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{emptyText ?? t("charts.empty")}</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
          width={32}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ fill: "hsl(var(--muted))" }}
          contentStyle={{
            background: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "var(--radius)",
            fontSize: 12,
          }}
        />
        <Bar
          dataKey="value"
          name={seriesName ?? t("charts.value")}
          radius={[4, 4, 0, 0]}
          maxBarSize={40}
          onClick={onSelect ? (_, index) => onSelect(data[index]) : undefined}
        >
          {data.map((d) => (
            <Cell key={d.label} fill={d.color ?? "hsl(var(--primary))"} className={onSelect ? "cursor-pointer" : undefined} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
