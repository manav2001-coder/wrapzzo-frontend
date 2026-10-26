import { useTranslation } from "react-i18next";

import { Skeleton } from "@/components/ui/skeleton";

/** Fewest and most fields a skeleton draws, whatever the form declares. */
const MIN_FIELDS = 4;
const MAX_FIELDS = 10;

interface FormSkeletonProps {
  /** How many fields the form declares; the skeleton draws about that many. */
  fieldCount?: number;
}

/**
 * The shape of a form while its Field Configuration loads: a label bar and an input bar per field,
 * on the same two-column grid the real form uses. Drawn instead of the unconfigured form, which
 * would show fields an admin has hidden and then snap them away.
 *
 * `aria-busy` and a label rather than `role="status"`: screens keep their own single status
 * message, and an extra status node on every cold form would be announced as one.
 */
export function FormSkeleton({ fieldCount = 6 }: FormSkeletonProps) {
  const { t } = useTranslation();
  const rows = Math.min(MAX_FIELDS, Math.max(MIN_FIELDS, fieldCount));
  return (
    <div aria-busy="true" aria-label={t("a11y.loading")} className="space-y-6">
      <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="space-y-2" data-testid="form-skeleton-field">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
      <Skeleton className="h-9 w-24" />
    </div>
  );
}
