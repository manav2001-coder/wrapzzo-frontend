import * as React from "react";

import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

// `title` is omitted from HTMLAttributes: the DOM's own `title` is a string tooltip, and
// ours is a ReactNode heading.
export interface SectionCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title?: React.ReactNode;
  /** v4's `subheader`. */
  description?: React.ReactNode;
  /** Right-aligned header slot — v4's `secondary`. */
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  /** Defaults to true whenever there is a title. */
  divider?: boolean;
  border?: boolean;
  /** Also drops the card's own white surface so it blends into the page background —
   *  distinct from `border={false}` (which only removes the border LINE and keeps the
   *  white `bg-card` fill) because several older `border={false}` consumers rely on
   *  keeping that fill, and forcing it transparent for all of them regressed their
   *  appearance app-wide. Opt in explicitly where a panel truly wants to blend in (the
   *  fleet console panels). */
  transparent?: boolean;
  /** v4's `boxShadow`. */
  elevated?: boolean;
  /** v4's `content` — false renders children with no padding wrapper. */
  padded?: boolean;
  /** v4's `contentSX`. */
  contentClassName?: string;
  /** Overrides the header's own padding/layout — the default `CardHeader` is `p-6`, too
   *  generous for a dense console panel that wants ~14-16px. */
  headerClassName?: string;
  loading?: boolean;
  children?: React.ReactNode;
}

/**
 * A titled section container: the `MainCard` equivalent.
 *
 * Named `SectionCard` rather than `MainCard` — it doesn't collide with shadcn's `Card`, and
 * says what the thing is for. "Main" was only ever meaningful relative to the v4 template.
 *
 * Dropped from v4's API, deliberately: `darkTitle` (one title style here), `sx`/`contentSX`
 * (→ `className`/`contentClassName`), `modal` (that's `AppDialog`'s job), and
 * `codeHighlight`/`codeString` (the showcase's own `ComponentDemo` already does that).
 */
export const SectionCard = React.forwardRef<HTMLDivElement, SectionCardProps>(
  (
    {
      title,
      description,
      actions,
      footer,
      divider,
      border = true,
      transparent = false,
      elevated = false,
      padded = true,
      contentClassName,
      headerClassName,
      loading,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const hasHeader = Boolean(title || description || actions);
    const showDivider = divider ?? Boolean(title);

    return (
      <Card
        ref={ref}
        className={cn(
          !border && "border-transparent",
          transparent && "bg-transparent",
          // `hover:shadow-sm` is baked into the Card primitive, so an unelevated card has
          // to opt out here. Overriding beats editing the primitive — zero blast radius.
          elevated ? "shadow-md" : "shadow-none hover:shadow-none",
          className,
        )}
        {...props}
      >
        {hasHeader && (
          <>
            <CardHeader
              className={cn(
                "flex flex-row items-start justify-between gap-4 space-y-0",
                headerClassName,
              )}
            >
              <div className="min-w-0 space-y-1">
                {title && <CardTitle className="text-base">{title}</CardTitle>}
                {description && <CardDescription>{description}</CardDescription>}
              </div>
              {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
            </CardHeader>
            {showDivider && <Separator />}
          </>
        )}

        {padded ? (
          <CardContent className={cn(hasHeader && "pt-6", contentClassName)}>
            {loading ? <SectionCardSkeleton /> : children}
          </CardContent>
        ) : (
          <div className={contentClassName}>{loading ? <SectionCardSkeleton /> : children}</div>
        )}

        {footer && (
          <>
            <Separator />
            <CardFooter className="pt-6">{footer}</CardFooter>
          </>
        )}
      </Card>
    );
  },
);
SectionCard.displayName = "SectionCard";

function SectionCardSkeleton() {
  return (
    <div className="space-y-2" data-testid="section-card-skeleton">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}
