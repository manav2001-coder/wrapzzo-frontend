import { Trash2 } from "lucide-react";
import { useFieldArray, type Control, type FieldValues } from "react-hook-form";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "react-i18next";

export interface DynamicFieldConfig {
  key: string;
  label: string;
  required?: boolean;
  /** Renders the control for this field in this row — wires its own value/onChange. */
  render: (index: number) => React.ReactNode;
}

export interface DynamicFieldListProps<TFieldValues extends FieldValues> {
  name: string;
  control: Control<TFieldValues>;
  fieldConfigs: DynamicFieldConfig[];
  createEmptyRow: () => Record<string, unknown>;
  addLabel?: string;
  minRows?: number;
  compact?: boolean;
  maxColumnsPerRow?: number;
  hideAddButton?: boolean;
  lockRowCount?: boolean;
  className?: string;
}

/**
 * Repeatable field-array on RHF's useFieldArray — replaces v4's Formik-array +
 * component.displayName-matching hack with a render-prop: the caller decides per-field
 * whether it's plain or self-binding, so this component needs zero knowledge of which
 * field components exist.
 */
export function DynamicFieldList<TFieldValues extends FieldValues>({
  name,
  control,
  fieldConfigs,
  createEmptyRow,
  addLabel = "Add row",
  minRows = 1,
  compact,
  maxColumnsPerRow,
  hideAddButton,
  lockRowCount,
  className,
}: DynamicFieldListProps<TFieldValues>) {
  const { t } = useTranslation();
  const { fields, append, remove } = useFieldArray({ control, name: name as never });
  const columns = Math.min(fieldConfigs.length, maxColumnsPerRow ?? fieldConfigs.length);
  const canRemove = !lockRowCount && fields.length > minRows;

  return (
    <div className={cn("space-y-3", className)}>
      {fields.map((field, index) => {
        const row = (
          <div
            className="grid flex-1 gap-3"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {fieldConfigs.map((fieldConfig) => (
              <div key={fieldConfig.key} className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  {fieldConfig.label}
                  {fieldConfig.required && <span className="text-destructive"> *</span>}
                </Label>
                {fieldConfig.render(index)}
              </div>
            ))}
          </div>
        );

        if (compact) {
          return (
            <div key={field.id}>
              <div className="flex items-start gap-2">
                {row}
                {canRemove && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mt-5 shrink-0"
                    onClick={() => remove(index)}
                    aria-label={t("a11y.removeRow")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {index < fields.length - 1 && <Separator className="mt-3" />}
            </div>
          );
        }

        return (
          <Card key={field.id}>
            <CardContent className="flex items-start gap-2 pt-4">
              {row}
              {canRemove && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="mt-5 shrink-0"
                  onClick={() => remove(index)}
                  aria-label={t("a11y.removeRow")}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
      {!hideAddButton && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append(createEmptyRow() as never)}
        >
          {addLabel}
        </Button>
      )}
    </div>
  );
}
