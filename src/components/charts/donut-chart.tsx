import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { useTranslation } from "react-i18next";

export interface DonutChartDatum {
  label: string;
  value: number;
  color: string;
  /** What `onSelect` hands back -- e.g. the status code behind a translated label. Defaults to `label`. */
  key?: string;
}

export interface DonutChartProps {
  data: DonutChartDatum[];
  height?: number;
  /** Shown instead of the ring when every value is zero. */
  emptyText?: string;
  /** Makes each slice a drill-down. */
  onSelect?: (key: string) => void;
}

/**
 * A small `recharts` donut — one categorical split (e.g. on-time vs delayed), per the
 * `dataviz` skill's mark choice for a part-of-whole comparison with few categories. Renders
 * the empty state when every value is zero, not just when the array itself is empty — a
 * month with no departures at all is otherwise an all-zero ring with nothing to read.
 */
export function DonutChart({ data, height = 200, emptyText, onSelect }: DonutChartProps) {
  const { t } = useTranslation();
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{emptyText ?? t("charts.empty")}</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
        <Pie
          data={data}
          dataKey="value"
          nameKey="label"
          innerRadius="55%"
          outerRadius="80%"
          paddingAngle={2}
          onClick={onSelect ? (_, index) => onSelect(data[index].key ?? data[index].label) : undefined}
        >
          {data.map((d) => (
            <Cell key={d.label} fill={d.color} className={onSelect ? "cursor-pointer" : undefined} />
          ))}
        </Pie>
        <Legend
          verticalAlign="bottom"
          height={24}
          formatter={(value) => <span className="text-xs text-foreground">{value}</span>}
        />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "var(--radius)",
            fontSize: 12,
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
