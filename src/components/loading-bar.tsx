import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export interface LoadingBarProps {
  /** Renders nothing when false. */
  active?: boolean;
  /** `fixed` pins it to the top of the viewport (v4's `Loader`); `inline` sits in flow. */
  position?: "fixed" | "inline";
  className?: string;
}

/**
 * An indeterminate top-of-page progress bar — the `Loader` equivalent.
 *
 * Reports no `aria-valuenow`: the duration is genuinely unknown, and a made-up number is
 * worse than none. Not `bunx shadcn@latest add progress`, which is determinate-only.
 */
export function LoadingBar({ active = true, position = "fixed", className }: LoadingBarProps) {
  const { t } = useTranslation();
  if (!active) return null;

  return (
    <div
      role="progressbar"
      aria-label={t("a11y.loading")}
      aria-busy="true"
      className={cn(
        "h-0.5 w-full overflow-hidden bg-primary/20",
        position === "fixed" && "fixed inset-x-0 top-0 z-50",
        className,
      )}
    >
      <div className="h-full w-1/3 animate-loading-bar rounded-full bg-primary" />
    </div>
  );
}
