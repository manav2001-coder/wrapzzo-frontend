import { ArrowRight, CircleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";

/** One step's problems, already named for the reader. */
export interface ValidationSummaryRow {
  /** Zero-based step index, or `null` on a form with no stepper. */
  stepIndex: number | null;
  /** "Validity" — the step's own name; `null` when it has none. */
  stepTitle: string | null;
  /** Labels of mandatory fields left empty. */
  missing: string[];
  /** Labels of fields that hold a value the rules refuse. */
  invalid: string[];
  /** The first failing field, which "Go to" focuses. */
  firstFieldId: string;
}

/**
 * The "Can't save yet" panel a failed save opens. It names every step that still has a problem,
 * which mandatory fields are empty and which hold a bad value, and offers a jump to each step —
 * so a user on step 1 is never left wondering why Save did nothing when the gap is on step 3.
 *
 * Rendered by `FormGenerator` itself, for every form. It reads the live errors, so a row shrinks
 * as each field is fixed and the panel closes once nothing is left.
 *
 * Only the heading is the live region, and it never changes while the panel is open: a screen
 * reader announces "Can't save yet" once, and is not set re-reading the whole panel on every
 * keystroke that fixes a field. The rows are read as ordinary content.
 */
export function FormValidationSummary({
  rows,
  general,
  onGo,
}: {
  rows: ValidationSummaryRow[];
  /** Messages no field on screen owns (a whole-form rule, a field the admin hid). */
  general: string[];
  onGo: (row: ValidationSummaryRow) => void;
}) {
  const { t } = useTranslation();
  if (rows.length === 0 && general.length === 0) return null;

  const fields = (labels: string[]) => labels.join(", ");

  return (
    <div
      data-testid="form-validation-summary"
      className="border-destructive/40 bg-destructive/5 rounded-lg border p-4"
    >
      <div className="flex items-start gap-3">
        <CircleAlert className="text-destructive mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1 space-y-3">
          <div role="alert" data-testid="form-validation-summary-heading">
            <p className="text-destructive text-sm font-semibold">{t("formValidation.title")}</p>
            <p className="text-muted-foreground text-sm">{t("formValidation.intro")}</p>
          </div>

          <ul className="space-y-2">
            {rows.map((row) => (
              <li
                key={row.stepIndex ?? "form"}
                className="bg-background flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-0.5 text-sm">
                  {row.stepIndex !== null && (
                    <p className="font-semibold">
                      {row.stepTitle
                        ? t("formValidation.stepWithName", {
                            step: row.stepIndex + 1,
                            name: row.stepTitle,
                          })
                        : t("formValidation.step", { step: row.stepIndex + 1 })}
                    </p>
                  )}
                  {row.missing.length > 0 && (
                    <p>
                      {t("formValidation.missing", {
                        count: row.missing.length,
                        fields: fields(row.missing),
                      })}
                    </p>
                  )}
                  {row.invalid.length > 0 && (
                    <p>
                      {t("formValidation.invalid", {
                        count: row.invalid.length,
                        fields: fields(row.invalid),
                      })}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="shrink-0 self-start sm:self-auto"
                  onClick={() => onGo(row)}
                >
                  {row.stepIndex !== null
                    ? t("formValidation.goToStep", { step: row.stepIndex + 1 })
                    : t("formValidation.showField")}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Button>
              </li>
            ))}
            {general.map((message, index) => (
              // Two rules can refuse with the same words; the index keeps their keys apart.
              <li
                key={`${index}:${message}`}
                className="bg-background rounded-md border p-3 text-sm"
              >
                {message}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/**
 * The one-line note under a step when Next is refused: which fields on THIS step stop it.
 */
export function StepValidationNote({ missing, invalid }: { missing: string[]; invalid: string[] }) {
  const { t } = useTranslation();
  if (missing.length === 0 && invalid.length === 0) return null;
  return (
    <div
      role="alert"
      data-testid="step-validation-note"
      className="border-destructive/40 bg-destructive/5 text-destructive flex items-start gap-2 rounded-md border px-3 py-2 text-sm"
    >
      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="space-y-0.5">
        {missing.length > 0 && (
          <p>
            {t("formValidation.nextMissing", {
              count: missing.length,
              fields: missing.join(", "),
            })}
          </p>
        )}
        {invalid.length > 0 && (
          <p>
            {t("formValidation.nextInvalid", {
              count: invalid.length,
              fields: invalid.join(", "),
            })}
          </p>
        )}
      </div>
    </div>
  );
}
