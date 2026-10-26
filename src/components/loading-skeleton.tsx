import { useTranslation } from "react-i18next";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Widths cycle so the lines read as text, not as a block of identical bars. */
const LINE_WIDTHS = ["w-full", "w-11/12", "w-3/4", "w-5/6", "w-2/3"];

interface LoadingSkeletonProps {
  /** How many lines to draw. */
  lines?: number;
  className?: string;
}

/**
 * The loading state of a panel, dialog body or detail page: pulsing lines in place of the words
 * "Loading…", so the area keeps roughly the shape of what replaces it.
 *
 * The visible text is gone but the accessible one stays — an `sr-only` "Loading" inside an
 * `aria-busy` container — so a screen reader still hears it and a test can still find it. Not
 * `role="status"`: screens keep their own single status message.
 */
export function LoadingSkeleton({ lines = 3, className }: LoadingSkeletonProps) {
  const { t } = useTranslation();
  return (
    <div aria-busy="true" className={cn("space-y-2", className)}>
      <span className="sr-only">{t("common:state.loading")}</span>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          aria-hidden="true"
          className={cn("h-4", LINE_WIDTHS[index % LINE_WIDTHS.length])}
        />
      ))}
    </div>
  );
}
