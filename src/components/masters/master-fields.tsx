import { z } from "zod";

import { i18next } from "@/lib/i18n";
import type { FieldConfig } from "@/components/fields/form-generator";
import { DatePicker } from "@/components/fields/date-picker";
import { NumberInput } from "@/components/fields/number-input";
import { SwitchField } from "@/components/fields/switch-field";
import { TextField } from "@/components/fields/text-field";
import { Combobox } from "@/components/fields/combobox";
import { FileDropzone } from "@/components/file-dropzone";
import { fromDateOnly, toDateOnly } from "@/lib/datetime";

/**
 * `FieldConfig` factories (MobixFL's `master-fields.tsx`): the screen says WHAT the field is, not
 * how a `TextField` is wired to react-hook-form. Written out longhand each field is the same
 * eight lines of render-prop plumbing around a different control.
 *
 * Factories rather than components on purpose — `FormGenerator` consumes plain `FieldConfig`
 * objects, and a component would need its own RHF wiring (`fieldKind: "custom"`).
 *
 * Two rules every builder here obeys:
 *
 * - **An optional schema must tolerate `""`.** `FormGenerator` defaults an untouched field to the
 *   empty string, so a schema rejecting `""` makes the form refuse to submit with nothing
 *   highlighted.
 * - **A builder forwards every prop it declares.** A prop it does not declare is a prop it
 *   silently drops (`initialValue`, `hidden`).
 */

/**
 * A blank required field's message. Without it, zod's own default ("String must contain at
 * least 1 character(s)") is what the user reads. A plain module, not a component, so it reads
 * the i18next singleton directly — called fresh on every schema build, so a language switch is
 * picked up like a label is.
 */
function requiredMessage(): string {
  return i18next.t("errors.required");
}

function invalidNumberMessage(): string {
  return i18next.t("errors.invalidNumber");
}

/** "At most N decimals", or "whole numbers only" at scale 0 — one message per precision. */
export function decimalsMessage(scale: number): string {
  return scale === 0
    ? i18next.t("errors.wholeNumberOnly")
    : i18next.t("errors.tooManyDecimals", { count: scale });
}

function futureDateMessage(): string {
  return i18next.t("errors.futureDate");
}

function pastDateMessage(): string {
  return i18next.t("errors.pastDate");
}

const DECIMAL_PATTERN = /^-?\d+(\.\d+)?$/;

/** Fractional digits in a decimal string, or `null` when it is not one (`1e5`, `0x10`, `12.`). */
function fractionDigits(value: string): number | null {
  const text = value.trim();
  if (!DECIMAL_PATTERN.test(text)) return null;
  const dot = text.indexOf(".");
  return dot === -1 ? 0 : text.length - dot - 1;
}

/** Whether `text` is a decimal AS IT IS BEING TYPED: admits "12." and "", refuses letters. */
function isDecimalInput(text: string, options: { negative?: boolean } = {}): boolean {
  return (options.negative ? /^-?\d*\.?\d*$/ : /^\d*\.?\d*$/).test(text);
}

interface Base {
  id: string;
  label: string;
  description?: string;
  required?: boolean;
  spanToFullRow?: boolean;
  /** Example text shown in an empty control. */
  placeholder?: string;
  /** Disable the control whatever the form's mode — e.g. an email that cannot change on edit. */
  lockedForEdit?: boolean;
  /**
   * Hide the field for the current values — `FieldConfig.hidden`, forwarded.
   *
   * Declared here because a builder DROPS any prop it does not name, which is this
   * codebase's most-repeated defect: `lookupField`, `metaField` and `numberField` all
   * silently ignored `initialValue`, and three combobox bridges did the same with `id`
   * before them. `FormGenerator` has supported `hidden` all along; every builder was
   * quietly discarding it, so the only way to get a conditional field was to hand-write
   * the whole `FieldConfig` and lose the builder's schema.
   *
   * A hidden field keeps its value and its schema, so make the schema tolerate the hidden
   * state — every optional builder here already does.
   */
  hidden?: (values: Record<string, unknown>) => boolean;
}

/** A free-text input. `max` mirrors the server schema so the two reject the same thing. */
export function textField({
  max = 255,
  multiline,
  ...base
}: Base & { max?: number; multiline?: boolean }): FieldConfig {
  return {
    ...base,
    zodSchema: base.required
      ? z.string().trim().min(1, requiredMessage()).max(max)
      : z.string().trim().max(max).optional().or(z.literal("")),
    render: ({ value, onChange, disabled }) => (
      <TextField
        value={(value as string) ?? ""}
        disabled={disabled || base.lockedForEdit}
        placeholder={base.placeholder}
        multiline={multiline}
        rows={multiline ? 3 : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
    ),
  };
}

/**
 * A whole number.
 *
 * The value is kept as a NUMBER (or `""`), never coerced from a string: `z.coerce.number()`
 * turns `""` into `0`, so an untouched capacity field would save as zero seats rather than
 * as "not recorded".
 */
/**
 * `initialValue` is declared here even though it is only forwarded, and that is the point:
 * a prop a builder does not DECLARE is a prop it silently drops. `FieldConfig` has carried
 * it all along and `switchField` forwards it, but `numberField` did not — so a REQUIRED
 * number whose schema has a default rendered empty, and the user had to type a value the
 * server would have supplied. Found by looking at the Fuel Types drawer in a browser; no
 * test could see it, because an empty required field is a valid form state until submit.
 */
export function numberField({
  min = 0,
  max,
  step = 1,
  allowDecimal = false,
  initialValue,
  ...base
}: Base & {
  min?: number;
  max: number;
  step?: number;
  /** Whole numbers by default; a field in hours ("8.5") opts in. */
  allowDecimal?: boolean;
  initialValue?: number;
}): FieldConfig {
  const bounded = (schema: z.ZodNumber) => (allowDecimal ? schema : schema.int()).min(min).max(max);
  return {
    ...base,
    ...(initialValue === undefined ? {} : { initialValue }),
    zodSchema: base.required
      ? // An untouched control's form value is `""`, not `undefined` — a plain `z.number()`
        // rejects that as `invalid_type_error`, not `required_error`, so both must carry
        // the same friendly message or a blank field shows "Expected number, received string".
        bounded(z.number({ error: requiredMessage() }))
      : z.union([z.literal(""), bounded(z.number())]).optional(),
    render: ({ value, onChange, disabled }) => (
      <NumberInput
        value={typeof value === "number" ? value : null}
        min={min}
        max={max}
        step={step}
        disabled={disabled || base.lockedForEdit}
        onChange={(next) => onChange(next ?? "")}
      />
    ),
  };
}

/**
 * A `numeric` column, kept as a STRING end to end.
 *
 * Never a float: a round-trip through binary floating point renders 12345.67 as
 * 12345.669999999999. Validated as a number, stored as the text the user typed.
 */
export function decimalField({
  min = 0,
  max,
  scale,
  ...base
}: Base & {
  min?: number;
  max: number;
  /**
   * The most fractional digits accepted, when the column's precision is configurable (a
   * fuel type's `decimalPrecision`). Counted on the TEXT typed, so `100.499` fails at 1 —
   * rounding it on save instead is a change the user never sees (MF-246).
   */
  scale?: number;
}): FieldConfig {
  /*
   * A decimal by the SAME pattern the money module and the API use, then the range.
   * `Number(v)` alone passed "1e5" and "0x10" — values no `numeric` column is written as
   * (MF-174). The range compare may use `Number`: it only orders a validated decimal.
   */
  const rule = (v: string) =>
    v === "" || (fractionDigits(v) !== null && Number(v) >= min && Number(v) <= max);
  const fits = (v: string) => scale === undefined || (fractionDigits(v) ?? 0) <= scale;
  const message = scale === undefined ? "" : decimalsMessage(scale);
  return {
    ...base,
    zodSchema: base.required
      ? // Separate refinements, not one combined check, so a BLANK value reports the
        // friendly required message and an out-of-range one reports a message that
        // actually names the problem — a bare `.refine((v) => v !== "" && rule(v))` used
        // zod's generic "Invalid input" for both.
        z
          .string()
          .trim()
          .refine((v) => v !== "", requiredMessage())
          .refine(rule, invalidNumberMessage())
          .refine(fits, message)
      : z
          .string()
          .trim()
          .refine(rule, invalidNumberMessage())
          .refine(fits, message)
          .optional()
          .or(z.literal("")),
    render: ({ value, onChange, disabled }) => (
      <TextField
        value={(value as string) ?? ""}
        disabled={disabled || base.lockedForEdit}
        placeholder={base.placeholder}
        inputMode="decimal"
        /*
         * `inputMode` only picks a phone's keypad; a desktop keyboard types anything. So a
         * keystroke or paste that could never become a number is refused here rather than
         * reported afterwards (MF-174). A minus only where the range reaches below zero.
         */
        onChange={(event) => {
          if (isDecimalInput(event.target.value, { negative: min < 0 })) {
            onChange(event.target.value);
          }
        }}
      />
    ),
  };
}

/**
 * A calendar date, held as `YYYY-MM-DD`.
 *
 * `toDateOnly`/`fromDateOnly` read and write LOCAL components. `toISOString().slice(0,10)`
 * would store the previous day for anyone west of Greenwich, and parsing a bare
 * `YYYY-MM-DD` through `new Date` UTC-parses it and shifts the day the other way — the trap
 * `lib/datetime.ts` exists to remove, and the one that would break SARATHI's DL+DOB match.
 *
 * `initialValue` is declared and forwarded for the same reason `numberField`'s own doc
 * comment states — a prop a builder does not declare is a prop it silently drops. This one
 * had never declared it at all, so TypeScript refused the call outright until now, rather
 * than the quieter runtime drop `numberField` shipped with.
 *
 * `notPast` is the opposite restriction from `future` and composes with it: `future` lifts
 * the UPPER bound (no cap on how far ahead a date may be), `notPast` raises the LOWER bound
 * to today (yesterday and earlier are refused, today itself is fine) — a "Required By" date
 * wants both at once. The calendar's `fromDate` must be today at LOCAL midnight, not
 * `new Date()`: react-day-picker's `before` matcher compares against each day cell, which is
 * itself local midnight, so a `fromDate` carrying the current time of day would disable
 * TODAY's own cell too (its midnight is "before" this afternoon).
 */
export function dateField({
  future,
  notPast,
  initialValue,
  ...base
}: Base & { future?: boolean; notPast?: boolean; initialValue?: string }): FieldConfig {
  // Compared as strings, never through `Date` — both sides are already `YYYY-MM-DD`, and
  // round-tripping either through `Date`/`toISOString` is the trap `lib/datetime.ts` exists
  // to remove. Mirrors the server's own `dateOfBirthSchema` refine in `packages/types`, so a
  // future date is caught inline instead of round-tripping to the API for a generic 400.
  const notFuture = (value: string) => !value || value <= (toDateOnly(new Date()) ?? "");
  const isNotPast = (value: string) => !value || value >= (toDateOnly(new Date()) ?? "");
  const startOfToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  };
  return {
    ...base,
    ...(initialValue === undefined ? {} : { initialValue }),
    zodSchema: base.required
      ? z
          .string()
          .min(1, requiredMessage())
          .pipe(z.string().date())
          .refine((v) => future || notFuture(v), futureDateMessage())
          .refine((v) => !notPast || isNotPast(v), pastDateMessage())
      : z
          .string()
          .date()
          .optional()
          .or(z.literal(""))
          .refine((v) => future || notFuture(v ?? ""), futureDateMessage())
          .refine((v) => !notPast || isNotPast(v ?? ""), pastDateMessage()),
    render: ({ value, onChange, disabled }) => (
      <DatePicker
        value={fromDateOnly(value as string) ?? null}
        disabled={disabled || base.lockedForEdit}
        fromDate={notPast ? startOfToday() : undefined}
        // A date of birth or an issue date cannot be in the future; an expiry can only be.
        toDate={future ? undefined : new Date()}
        onChange={(next) => onChange(toDateOnly(next) ?? "")}
      />
    ),
  };
}

/**
 * A wall-clock time, `HH:MM`. Not a `Date` — see `timeOfDaySchema`.
 *
 * `initialValue` is declared and forwarded for the same reason `numberField`'s own doc
 * comment states — a prop a builder does not declare is a prop it silently drops.
 */
export function timeField({
  initialValue,
  ...base
}: Base & { initialValue?: string }): FieldConfig {
  return {
    ...base,
    ...(initialValue === undefined ? {} : { initialValue }),
    zodSchema: base.required
      ? z
          .string()
          .min(1, requiredMessage())
          .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
      : z
          .string()
          .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
          .optional()
          .or(z.literal("")),
    render: ({ value, onChange, disabled }) => (
      <TextField
        type="time"
        // Postgres `time` round-trips with seconds, so an edit form receives "06:00:00"
        // while `<input type="time">` renders "06:00". Trimming here keeps the control from
        // reporting a change the user did not make.
        value={((value as string) ?? "").slice(0, 5)}
        disabled={disabled || base.lockedForEdit}
        onChange={(event) => onChange(event.target.value)}
      />
    ),
  };
}

/** A boolean switch. Always full-row: a lone switch in a grid column reads as misaligned. */
export function switchField(base: Base & { initialValue?: boolean }): FieldConfig {
  return {
    spanToFullRow: true,
    ...base,
    fieldKind: "boolean",
    initialValue: base.initialValue ?? false,
    zodSchema: z.boolean().optional(),
    render: ({ value, onChange, disabled }) => (
      <SwitchField
        checked={Boolean(value)}
        disabled={disabled || base.lockedForEdit}
        onCheckedChange={(checked) => onChange(checked)}
      />
    ),
  };
}

/**
 * A closed set of string options.
 *
 * `Combobox` deals in whole option OBJECTS (it needs a stable identity to render and
 * compare), while the form field stores the bare value — so this translates in both
 * directions. That is the same id-in/id-out bridging `LookupCombobox` does for FK pickers;
 * doing it here keeps every screen from re-deriving it per select.
 */
export function selectField({
  options,
  initialValue,
  ...base
}: Base & {
  options: { value: string; label: string }[];
  /**
   * The value a new row starts with.
   *
   * Worth passing wherever the CONTRACT has a `.default()`: without it the field starts as
   * `""`, and a `required` select then blocks Save on a choice the API would have made
   * itself — a form that refuses to submit with the offending field looking untouched.
   */
  initialValue?: string;
}): FieldConfig {
  return {
    initialValue,
    ...base,
    zodSchema: base.required
      ? z.string().min(1, requiredMessage())
      : z.string().optional().or(z.literal("")),
    render: ({ value, onChange, disabled }) => (
      <Combobox
        options={options}
        value={options.find((option) => option.value === value) ?? null}
        displayValue={(option) => option.label}
        getOptionKey={(option) => option.value}
        disabled={disabled || base.lockedForEdit}
        placeholder={base.placeholder}
        onChange={(next) => onChange((next as { value: string } | null)?.value ?? "")}
      />
    ),
  };
}

/**
 * A closed set of values, several of which may be chosen — operating days, facilities.
 *
 * The form value is a string ARRAY, which is what the `jsonb` column stores, so the option
 * values must be the persisted codes rather than display text. `Combobox`'s multiple mode
 * renders the chips ALONGSIDE the trigger rather than inside it, which is worth knowing
 * when asserting on this in a test: assert on the document, not on the trigger's text.
 */
export function multiSelectField({
  options,
  ...base
}: Base & { options: { value: string; label: string }[] }): FieldConfig {
  return {
    spanToFullRow: true,
    ...base,
    initialValue: [],
    zodSchema: base.required
      ? z.array(z.string()).min(1, requiredMessage())
      : z.array(z.string()).optional(),
    render: ({ value, onChange, disabled }) => {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <Combobox
          multiple
          options={options}
          value={options.filter((option) => selected.includes(option.value))}
          displayValue={(option) => option.label}
          getOptionKey={(option) => option.value}
          disabled={disabled || base.lockedForEdit}
          placeholder={base.placeholder}
          onChange={(next) =>
            onChange(((next as { value: string }[] | null) ?? []).map((option) => option.value))
          }
        />
      );
    },
  };
}

/**
 * One or more files, held IN the form so they travel with its other values.
 *
 * The value is a `File[]` (empty until something is chosen). The schema is where the rules live:
 * an accepted extension and a size cap, each refused under the field with the caller's own
 * message — the same inline-validation promise every other builder here keeps. `accept` only
 * narrows what the OS picker offers; it is never the check. The server judges the type and the
 * bytes again and is the authority.
 */
export function fileField({
  accept,
  extensions,
  maxBytes,
  multiple,
  prompt,
  removeLabel,
  typeMessage,
  tooLargeMessage,
  emptyMessage,
  ...base
}: Base & {
  accept: Record<string, string[]>;
  /** Lower-case, no dot — what the schema accepts. */
  extensions: readonly string[];
  maxBytes: number;
  multiple?: boolean;
  prompt: string;
  removeLabel: (fileName: string) => string;
  typeMessage: (fileName: string) => string;
  tooLargeMessage: (fileName: string) => string;
  emptyMessage: (fileName: string) => string;
}): FieldConfig {
  const file = z.custom<File>((value) => value instanceof File);
  const list = base.required ? z.array(file).min(1, requiredMessage()) : z.array(file);
  const checked = list.superRefine((files, ctx) => {
    for (const entry of files) {
      const dot = entry.name.lastIndexOf(".");
      const extension = dot < 0 ? "" : entry.name.slice(dot + 1).toLowerCase();
      if (!extensions.includes(extension)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: typeMessage(entry.name) });
      } else if (entry.size > maxBytes) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: tooLargeMessage(entry.name) });
      } else if (entry.size === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: emptyMessage(entry.name) });
      }
    }
  });
  return {
    ...base,
    initialValue: [],
    zodSchema: base.required ? checked : checked.optional(),
    render: ({ value, onChange, disabled }) => (
      <FileDropzone
        id={base.id}
        files={(value as File[] | undefined) ?? []}
        onFilesChange={onChange}
        accept={accept}
        multiple={multiple}
        disabled={disabled || base.lockedForEdit}
        prompt={prompt}
        removeLabel={removeLabel}
        rejectedMessage={typeMessage}
      />
    ),
  };
}

/**
 * An email address. Lower-level than `textField` only in its format check; the server
 * re-validates (`@Email`) and is the authority.
 */
export function emailField({ max = 320, ...base }: Base & { max?: number }): FieldConfig {
  const format = z.string().trim().email(i18next.t("errors.invalidEmail")).max(max);
  return {
    ...base,
    zodSchema: base.required
      ? z.string().trim().min(1, requiredMessage()).pipe(format)
      : format.optional().or(z.literal("")),
    render: ({ value, onChange, disabled }) => (
      <TextField
        type="email"
        value={(value as string) ?? ""}
        disabled={disabled || base.lockedForEdit}
        onChange={(event) => onChange(event.target.value)}
      />
    ),
  };
}

/**
 * A phone number as typed. Wrappzo stores phones as free text (the backend has no E.164
 * contract), so this is a `tel` input with a loose character check rather than MobixFL's
 * country-aware `PhoneField`.
 */
export function phoneField({ max = 30, ...base }: Base & { max?: number }): FieldConfig {
  const format = z
    .string()
    .trim()
    .max(max)
    .regex(/^[+\d][\d\s()-]*$/, i18next.t("field.phoneInvalid"));
  return {
    ...base,
    zodSchema: base.required
      ? z.string().trim().min(1, requiredMessage()).pipe(format)
      : format.optional().or(z.literal("")),
    render: ({ value, onChange, disabled }) => (
      <TextField
        type="tel"
        inputMode="tel"
        value={(value as string) ?? ""}
        disabled={disabled || base.lockedForEdit}
        onChange={(event) => onChange(event.target.value)}
      />
    ),
  };
}
