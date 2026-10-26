import type { TFunction } from "i18next";

import { Combobox } from "@/components/fields/combobox";
import { DateRangePicker, type DateRangeValue } from "@/components/fields/date-range-picker";
import { NumberInput } from "@/components/fields/number-input";
import { TextField } from "@/components/fields/text-field";
import type { FieldConfig } from "@/components/fields/form-generator";
import type { FilterOption, TableFilterField } from "@/components/data-table/types";

const sameValue = (a: unknown, b: unknown) => String(a) === String(b);

/**
 * A panel field declaration turned into a Form Builder field.
 *
 * The panel renders through `FormGenerator` rather than growing its own renderer, per
 * `.claude/rules/quality.md` — "never create a new framework, pattern, utility or component
 * when one already exists". It previously ignored `TableFilterField.type` entirely and rendered
 * a plain `<Input>` for all five types, so a `select` was a free-text box and a `dateRange` was
 * impossible. v4 got this right (`CustomFormGenerator … mode="filter"`); the port did not.
 *
 * **The form value stays FLAT** — the raw value, or an array of raw values, never the option
 * object. v4 stores the object and unwraps it on apply, which forces it to also stash a
 * `<key>_label` shadow entry so its chips can show a name instead of an id, then strip those
 * entries again before every request. Resolving the label from `options` at render time (see
 * `filterChipLabel`) needs none of that.
 */
export function buildFilterFields(fields: TableFilterField[], t: TFunction): FieldConfig[] {
  return fields.map((field) => {
    const base = { id: field.id, label: field.label };
    const options = field.options ?? [];

    switch (field.type) {
      case "select":
        return {
          ...base,
          render: ({ value, onChange, disabled }) => (
            <Combobox<FilterOption>
              options={options}
              displayValue={(option) => option.label}
              getOptionKey={(option) => String(option.value)}
              value={options.find((option) => sameValue(option.value, value)) ?? null}
              onChange={(option) => onChange(option ? (option as FilterOption).value : undefined)}
              placeholder={field.placeholder ?? t("table.filterAll")}
              disabled={disabled}
            />
          ),
        } satisfies FieldConfig;

      case "multiselect": {
        const selected = (value: unknown) => {
          const list = Array.isArray(value) ? value : [];
          return options.filter((option) => list.some((entry) => sameValue(option.value, entry)));
        };
        return {
          ...base,
          render: ({ value, onChange, disabled }) => (
            <Combobox<FilterOption>
              multiple
              options={options}
              displayValue={(option) => option.label}
              getOptionKey={(option) => String(option.value)}
              value={selected(value)}
              onChange={(next) => {
                const list = (next as FilterOption[] | null) ?? [];
                onChange(list.length ? list.map((option) => option.value) : undefined);
              }}
              placeholder={field.placeholder ?? t("table.filterAll")}
              disabled={disabled}
            />
          ),
        } satisfies FieldConfig;
      }

      case "dateRange":
        return {
          ...base,
          render: ({ value, onChange, disabled }) => (
            <DateRangePicker
              value={value as DateRangeValue | undefined}
              onChange={onChange}
              placeholder={field.placeholder ?? t("dateRange.placeholder")}
              disabled={disabled}
            />
          ),
        } satisfies FieldConfig;

      case "number":
        return {
          ...base,
          render: ({ value, onChange, onBlur, disabled }) => (
            <NumberInput
              value={typeof value === "number" ? value : null}
              onChange={(next) => onChange(next ?? undefined)}
              onBlur={onBlur}
              placeholder={field.placeholder}
              disabled={disabled}
              fullWidth
            />
          ),
        } satisfies FieldConfig;

      case "text":
      default:
        return {
          ...base,
          render: ({ value, onChange, onBlur, disabled }) => (
            <TextField
              value={(value as string) ?? ""}
              onChange={(event) => onChange(event.target.value)}
              onBlur={onBlur}
              placeholder={field.placeholder ?? t("table.searchPlaceholder")}
              disabled={disabled}
              fullWidth
            />
          ),
        } satisfies FieldConfig;
    }
  });
}
