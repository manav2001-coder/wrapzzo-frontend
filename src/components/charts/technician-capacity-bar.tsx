import { useTranslation } from "react-i18next";

export interface TechnicianCapacityRow {
  technicianUserId: string;
  technicianName: string;
  /** Minutes booked within the shift window. */
  bookedMinutes: number;
  /** Total shift-window length in minutes. */
  shiftMinutes: number;
}

export interface TechnicianCapacityBarProps {
  rows: TechnicianCapacityRow[];
}

/**
 * One horizontal booked/free bar per technician, against today's shift window —
 * `docs/fleet-platform/04-maintenance-agent.md` §6.2's "Workshop capacity today" section.
 * Plain flexbox segments rather than a `recharts` bar chart: a per-row stacked capacity bar
 * is naturally a two-segment fill, not a categorical measure — text carries the exact
 * numbers so color is never the only signal (the `dataviz` skill's accessibility rule).
 */
export function TechnicianCapacityBar({ rows }: TechnicianCapacityBarProps) {
  const { t } = useTranslation();

  if (rows.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        {t("maintenance.capacity.empty")}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const bookedPct =
          row.shiftMinutes > 0 ? Math.min(100, (row.bookedMinutes / row.shiftMinutes) * 100) : 0;
        const freeMinutes = Math.max(0, row.shiftMinutes - row.bookedMinutes);
        return (
          <div key={row.technicianUserId}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium">{row.technicianName}</span>
              <span className="tabular-nums text-muted-foreground">
                {Math.round(row.bookedMinutes)}m booked / {Math.round(freeMinutes)}m free
              </span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={Math.round(bookedPct)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="h-full rounded-full bg-primary" style={{ width: `${bookedPct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
