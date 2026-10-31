import * as React from "react";
import { useTranslation } from "react-i18next";
import type { PermissionKey } from "@/lib/permissions";

import { Combobox } from "@/components/fields/combobox";
import { useHasAccess } from "@/hooks/use-permission";

export interface Option {
  value: string;
  label: string;
}

interface ValueComboboxProps {
  options: Option[];
  /** The selected `value`, not the option object. */
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  /**
   * Injected by `FormControl`, which clones its child with `id`/`aria-describedby`/
   * `aria-invalid`. This is a BRIDGE component, so it has to hand them on to `Combobox`
   * — which already puts them on its trigger button. Accepting them nowhere is the same
   * defect `LookupCombobox` had: the props die on a component that does not declare them,
   * `FormLabel`'s `htmlFor` dangles, and the control is announced unlabelled.
   */
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  "aria-label"?: string;
}

/**
 * `Combobox` addressed by option VALUE rather than by option object.
 *
 * The underlying component is object-based, which is right for its async mode but wrong
 * for a form field: react-hook-form stores a scalar, so every call site would otherwise
 * repeat the same find-by-value / map-back-to-value dance. Doing it once here also means
 * a value with no matching option still round-trips instead of silently clearing itself
 * — the failure mode where opening an edit form wipes a field the user never touched.
 */
export function ValueCombobox({
  options,
  value,
  onChange,
  placeholder,
  emptyText,
  disabled,
  id,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  "aria-label": ariaLabel,
}: ValueComboboxProps) {
  // A stored value the option list does not contain (a deactivated row, a zone this
  // runtime does not enumerate) is shown as itself rather than dropped.
  const resolved = React.useMemo<Option | null>(() => {
    if (value === null || value === undefined || value === "") return null;
    return options.find((option) => option.value === value) ?? { value, label: value };
  }, [options, value]);

  return (
    <Combobox<Option>
      options={options}
      value={resolved}
      onChange={(next) => onChange((next as Option | null)?.value ?? null)}
      displayValue={(option) => option.label}
      getOptionKey={(option) => option.value}
      placeholder={placeholder}
      emptyText={emptyText}
      disabled={disabled}
      id={id}
      aria-describedby={ariaDescribedBy}
      aria-invalid={ariaInvalid}
      aria-label={ariaLabel}
    />
  );
}

interface MultiValueComboboxProps {
  options: Option[];
  /**
   * Where the "Click to add" row sends the user, and the key that lets them create there: the master
   * that owns these options (roles, templates). Opens in a new tab so the half-filled form survives; no
   * create permission, no row. Opt-in, as on `LookupCombobox`.
   */
  addTarget?: { permission: PermissionKey; path: string };
  value: string[] | undefined;
  onChange: (value: string[]) => void;
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  /**
   * Injected by `FormControl`, which clones its child with `id`/`aria-describedby`/
   * `aria-invalid`. This is a BRIDGE component, so it has to hand them on to `Combobox`
   * — which already puts them on its trigger button. Accepting them nowhere is the same
   * defect `LookupCombobox` had: the props die on a component that does not declare them,
   * `FormLabel`'s `htmlFor` dangles, and the control is announced unlabelled.
   */
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  /** Same bridge, for a caller with no `<label htmlFor>` wired to this control at all (Plan
   * Duty's Weekly Off field uses a plain, unconnected `<label>` the way its own route pickers
   * already do — see `DutyPlanBulkCreate.tsx`). */
  "aria-label"?: string;
}

/** The multi-select form of the same idea — used by the User master's role picker. */
export function MultiValueCombobox({
  options,
  addTarget,
  value,
  onChange,
  placeholder,
  emptyText,
  disabled,
  id,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  "aria-label": ariaLabel,
}: MultiValueComboboxProps) {
  const { t } = useTranslation("common");
  const canAdd = useHasAccess(addTarget?.permission);
  const resolved = React.useMemo<Option[]>(
    () =>
      (value ?? []).map(
        (item) => options.find((option) => option.value === item) ?? { value: item, label: item },
      ),
    [options, value],
  );

  return (
    <Combobox<Option>
      multiple
      options={options}
      value={resolved}
      addNew={
        addTarget && canAdd
          ? {
              label: t("action.clickToAdd"),
              onAdd: () => window.open(addTarget.path, "_blank", "noopener"),
            }
          : undefined
      }
      onChange={(next) => onChange(((next as Option[] | null) ?? []).map((option) => option.value))}
      displayValue={(option) => option.label}
      getOptionKey={(option) => option.value}
      placeholder={placeholder}
      emptyText={emptyText}
      disabled={disabled}
      id={id}
      aria-describedby={ariaDescribedBy}
      aria-invalid={ariaInvalid}
      aria-label={ariaLabel}
    />
  );
}
