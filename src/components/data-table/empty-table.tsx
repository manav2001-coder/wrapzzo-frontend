import { useTranslation } from "react-i18next";

import * as React from "react";
import { PackageOpen } from "lucide-react";

import { cn } from "@/lib/utils";

export interface EmptyTableProps {
  message?: string;
  icon?: React.ReactNode;
  description?: string;
  /** e.g. a "Create the first one" button. */
  action?: React.ReactNode;
  className?: string;
}

/**
 * The "no rows" body of a table, extracted from `DataTable` so lists and cards can reuse
 * it. Table-agnostic on purpose: the caller owns the `<TableRow><TableCell colSpan>`
 * wrapper, so this renders no table markup of its own.
 *
 * v4's `EmptyTable` shipped a 120x100 antd SVG illustration whose fills came from
 * `theme.palette.secondary[200|400|A100…]`. Those have no semantic-token equivalent here
 * and hard-coding them would break the no-raw-hex rule, so the lucide icon stands in.
 */
export function EmptyTable({ message, icon, description, action, className }: EmptyTableProps) {
  const { t } = useTranslation();
  const text = message ?? t("state.noResults");
  return (
    <div className={cn("flex flex-col items-center gap-2 text-muted-foreground", className)}>
      {icon ?? <PackageOpen className="h-8 w-8 opacity-50" />}
      <span>{text}</span>
      {description && <p className="max-w-sm text-center text-sm">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
