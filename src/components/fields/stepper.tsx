import { Fragment } from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export interface StepperProps {
  steps: string[];
  activeStep: number;
  orientation?: "horizontal" | "vertical";
  onStepClick?: (index: number) => void;
  /**
   * Keep the labels off screen — where there are too many to fit under the circles (the
   * Employee drawer's pages). They still name each step for assistive tech, which a clickable
   * circle needs: a completed one shows a check, not its number.
   */
  hideLabels?: boolean;
  /**
   * How many fields on each step currently fail validation, by step index. A step with any shows a
   * red ring and a count badge on its circle, so a failed save says WHERE to look before the user
   * opens a single step. Absent or zero: the circle renders as before.
   */
  errorCounts?: readonly number[];
  /** The accessible text for a step's error badge, e.g. "2 fields need attention". */
  errorLabel?: (count: number) => string;
  className?: string;
}

/** Hand-built (no shadcn primitive exists): numbered circles connected by lines. */
export function Stepper({
  steps,
  activeStep,
  orientation = "horizontal",
  onStepClick,
  hideLabels = false,
  errorCounts,
  errorLabel,
  className,
}: StepperProps) {
  const isHorizontal = orientation === "horizontal";
  const clickable = Boolean(onStepClick);

  return (
    <div className={cn("flex", isHorizontal ? "flex-row items-center" : "flex-col", className)}>
      {steps.map((step, index) => {
        const errors = errorCounts?.[index] ?? 0;
        const isCompleted = index < activeStep && errors === 0;
        const isActive = index === activeStep;

        const circle = (
          <div
            className={cn(
              "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-shadow",
              (isCompleted || isActive) && "bg-primary text-primary-foreground",
              !isCompleted && !isActive && "bg-muted text-muted-foreground",
              isActive && errors === 0 && "ring-primary/15 ring-4",
              errors > 0 && "ring-2 ring-destructive ring-offset-2 ring-offset-background",
            )}
          >
            {isCompleted ? <Check className="h-3.5 w-3.5" /> : index + 1}
            {errors > 0 && (
              <span
                className="bg-destructive text-destructive-foreground absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none"
                aria-label={errorLabel?.(errors)}
              >
                {errors}
              </span>
            )}
          </div>
        );

        const stepButton = clickable ? (
          <button
            type="button"
            onClick={() => onStepClick?.(index)}
            aria-label={
              errors > 0 && errorLabel
                ? `${step || String(index + 1)}: ${errorLabel(errors)}`
                : step || String(index + 1)
            }
            aria-current={isActive}
            className="shrink-0"
          >
            {circle}
          </button>
        ) : (
          <span aria-current={isActive} className="shrink-0">
            {circle}
          </span>
        );

        if (isHorizontal) {
          // The circle+connector row and each label are on TWO INDEPENDENT layout axes.
          // The label is `absolute`, positioned relative to a `relative` wrapper sized to
          // EXACTLY the circle (nothing else) — so it can never widen that wrapper's box and
          // can never push the connector that follows it. Centring is `left-1/2
          // -translate-x-1/2` on the label itself, not on the row, so the label centres
          // under the CIRCLE'S OWN midpoint however long its text is, while the row above it
          // stays exactly the circle-then-line shape with no gap between them.
          //
          // The previous shape sized each step's box to fit whichever was WIDER, the circle
          // or the label — so a label longer than the circle (nearly always) widened the box,
          // and the connector (a sibling AFTER it) started from the label's far edge instead
          // of the circle's, opening a visible gap between a circle and its own line.
          return (
            <Fragment key={index}>
              <div className="relative shrink-0">
                {stepButton}
                {hideLabels ? null : (
                  <span
                    className={cn(
                      // Wraps inside a fixed width instead of running on: five labels in a drawer are
                      // wider than the room between their circles, and a `nowrap` one overlapped its
                      // neighbour and was clipped at the edge. The first and last hang from their own
                      // edge, so the outer two never poke past the stepper.
                      "absolute top-full mt-2.5 w-24 text-xs font-medium leading-tight",
                      index === 0 && "left-0 text-left",
                      index === steps.length - 1 && index !== 0 && "right-0 text-right",
                      index !== 0 &&
                        index !== steps.length - 1 &&
                        "left-1/2 -translate-x-1/2 text-center",
                      isActive ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {step}
                  </span>
                )}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 rounded-full",
                    isCompleted ? "bg-primary" : "bg-border",
                  )}
                />
              )}
            </Fragment>
          );
        }

        return (
          <div key={index} className="flex gap-3">
            <div className="flex flex-col items-center">
              {stepButton}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "mt-1 w-0.5 flex-1 rounded-full",
                    isCompleted ? "bg-primary" : "bg-border",
                  )}
                />
              )}
            </div>
            <span
              className={cn(
                "pb-6 pt-1 text-xs font-medium",
                isActive ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {step}
            </span>
          </div>
        );
      })}
    </div>
  );
}
