import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/axiosClient";
import { cn } from "@/lib/utils";

export interface ErrorTableProps {
  error: unknown;
  onRetry?: () => void;
  className?: string;
}

/**
 * The "this failed" body of a table — the counterpart to `<EmptyTable />`. The caller owns the
 * `<TableRow><TableCell colSpan>` wrapper.
 *
 * Exists because a failed load must not render as "No results.": a 500, a dropped connection and a
 * genuinely empty list would otherwise look identical, with no message and no retry.
 *
 * Message selection mirrors `useApiErrorToast`: the backend's domain message is shown as written; a
 * server fault gets the friendly generic line; no response at all means the network.
 */
export function ErrorTable({ error, onRetry, className }: ErrorTableProps) {
  const { t } = useTranslation();

  const headline = React.useMemo(() => {
    if (error instanceof ApiError) {
      if (error.status === undefined) return t("errors.network");
      if (error.status >= 500) return t("errors.generic");
      return error.message || t("errors.generic");
    }
    return t("errors.generic");
  }, [error, t]);

  return (
    // role="alert" so the failure is announced, and so tests can assert on the state itself.
    <div
      role="alert"
      className={cn("flex flex-col items-center gap-2 text-muted-foreground", className)}
    >
      <AlertTriangle className="h-8 w-8 text-destructive opacity-80" />
      <span className="font-medium text-foreground">{headline}</span>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
          {t("action.retry")}
        </Button>
      )}
    </div>
  );
}
