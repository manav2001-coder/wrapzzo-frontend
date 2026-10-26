export type StatColor = "default" | "primary" | "success" | "warning" | "destructive";

/**
 * Status lives on the NUMBER's text colour, never on the card border. A full-height coloured
 * border block on every tile is the one thing every generic AI-generated dashboard does —
 * see `customer_support/frontend/src/pages/ClientDashboard.tsx`'s `Stat` component ("Flat KPI
 * card - label above, number bold, no colored borders"), the reference this app restyled
 * itself against. Flat, neutral, unmistakably intentional. Shared by `StatCard` and
 * `FleetKpiRow` (`.claude/rules/quality.md`'s "helper exported beside a component costs Fast
 * Refresh" — this used to live inside `stat-card.tsx`).
 */
export const VALUE_COLOR_CLASSES: Record<StatColor, string> = {
  default: "text-foreground",
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
};
