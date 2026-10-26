import { ChevronDown, ChevronUp } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export interface FormSectionHeaderProps {
  title: string;
  icon?: React.ReactNode;
  /** A muted line under the title, for a section whose purpose is not obvious from its name. */
  description?: string;
  collapsible?: boolean;
  open?: boolean;
  onToggle?: (open: boolean) => void;
  className?: string;
}

/**
 * A section heading: a primary accent bar, the title, an optional description and the divider.
 * The accent bar is what lifts it above a field label at a glance; the Separator stays because
 * tests and the collapsed state both key off it.
 */
export function FormSectionHeader({
  title,
  icon,
  description,
  collapsible,
  open = true,
  onToggle,
  className,
}: FormSectionHeaderProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span aria-hidden="true" className="bg-primary h-4 w-1 shrink-0 rounded-full" />
          {icon}
          <div className="min-w-0">
            <span className="block text-sm font-semibold">{title}</span>
            {description ? (
              <span className="text-muted-foreground block text-xs font-normal">{description}</span>
            ) : null}
          </div>
        </div>
        {collapsible && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onToggle?.(!open)}
            aria-label={open ? "Collapse section" : "Expand section"}
          >
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        )}
      </div>
      <Separator />
    </div>
  );
}
