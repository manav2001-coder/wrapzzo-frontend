import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useForm, type FieldValues, type Resolver, type UseFormReturn } from "react-hook-form";
import { z } from "zod";

import {
  resolveFormLayout,
  summarizeErrorsByStep,
  type ResolvedFormLayout,
  type ResolvedFormSection,
} from "@/lib/form-layout";
import { cn } from "@/lib/utils";
import { registerFormServerErrorSink } from "@/lib/form-server-errors";
import { usePermissions } from "@/hooks/use-permission";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { FormSectionHeader } from "@/components/fields/form-section-header";
import {
  FormValidationSummary,
  StepValidationNote,
  type ValidationSummaryRow,
} from "@/components/fields/form-validation-summary";
import { Stepper } from "@/components/fields/stepper";

export interface FieldConfig {
  id: string;
  label?: string;
  /** Helper text under the control. */
  description?: string;
  zodSchema?: z.ZodTypeAny;
  initialValue?: unknown;
  required?: boolean;
  spanToFullRow?: boolean;
  /**
   * Hide this field for the current values. Called on every render with the live form
   * values, so it can depend on another field (e.g. only show the Franchise picker to a
   * super admin, or a "reason" box once a status is set).
   *
   * A hidden field keeps its value and its schema — it is not unregistered. Make its
   * schema tolerate the hidden state (`.optional()`) rather than expecting validation to
   * skip it, otherwise the form fails on a field the user cannot see or fix.
   */
  hidden?: (values: Record<string, unknown>) => boolean;
  /**
   * 'text'/'boolean' (default 'text'): FormGenerator wires FormField's {value,onChange,onBlur,error}
   * into `render` — for a boolean field the caller's own render fn just treats `value` as the
   * checked boolean and calls `onChange(checked)` (e.g. `<SwitchField checked={value as boolean}
   * onCheckedChange={onChange} />`); the render-prop pattern means no special-casing is needed
   * here, unlike v4's prop-injection-by-cloning approach. 'custom': the field manages its own RHF
   * wiring internally (e.g. via useController) — FormGenerator renders `renderCustom` bare,
   * injecting nothing. Replaces v4's fragile component-identity/displayName matching for
   * self-binding fields with this explicit discriminant.
   */
  fieldKind?: "text" | "boolean" | "custom";
  render?: (props: {
    value: unknown;
    onChange: (value: unknown) => void;
    onBlur: () => void;
    error?: string;
    disabled: boolean;
  }) => React.ReactNode;
  renderCustom?: () => React.ReactNode;
  className?: string;
  /** A heading marker from `sectionField` (`form-section.tsx`), not a field. */
  isSectionHeading?: boolean;
}

export interface StepConfig {
  label?: string;
  fields: FieldConfig[];
}

/** What a parent needs from the form when it renders the submit button itself. */
export interface FormGeneratorHandle {
  /** Settles when the submit has finished, so a drawer can hold off dismissal until then. */
  submit(): void | Promise<void>;
  reset(values?: Record<string, unknown>): void;
  /**
   * Write one field from outside the form — for a cross-field effect a field's own
   * `onChange` cannot express. The Address master's pincode lookup uses it to fill
   * country/state/city in one go.
   *
   * Marks the form dirty and re-runs validation, so the value is treated exactly as if
   * the user had typed it.
   */
  setValue(name: string, value: unknown): void;
  /**
   * The form's CURRENT values, read at call time rather than captured when the handle was made.
   *
   * For an action that needs what is on screen without submitting it — the template editor's
   * Preview renders the unsaved draft, which is the whole point of a preview. Not validated: a
   * half-typed form is a legitimate thing to ask about.
   */
  getValues(): Record<string, unknown>;
  isSubmitting: boolean;
  isDirty: boolean;
  /**
   * Stepper mode only — where the form is, and how to move, for a parent that renders the
   * Back/Next buttons itself (a drawer footer). `next` validates the current step first,
   * exactly like the form's own Continue.
   */
  step?: FormStepHandle;
}

export interface FormStepHandle {
  index: number;
  count: number;
  next(): void;
  back(): void;
  goTo(index: number): void;
}

export interface FormGeneratorProps {
  maxWidgetsPerRow: number;
  onSubmit: (values: Record<string, unknown>) => Promise<void> | void;
  mode?: "create" | "edit" | "view" | "filter";
  fields?: FieldConfig[];
  steps?: StepConfig[];
  /**
   * Values to load into the form, replacing `initialValue`. Applied whenever the object
   * identity changes, so an edit form fed by an async fetch populates when the data
   * ARRIVES — `defaultValues` alone is read once at mount and would leave the form blank.
   */
  values?: Record<string, unknown>;
  hideCardWrapper?: boolean;
  buttonAlignment?: "start" | "end" | "center";
  hideSubmitButton?: boolean;
  /** Override the submit button's label. Defaults by `mode`. */
  submitLabel?: string;
  /**
   * Permission required to submit. Without it the form renders READ-ONLY rather than
   * showing a button that will 403 — the API enforces the same key regardless.
   */
  submitPermission?: string | string[];
  /**
   * Receives a handle for submitting from outside the form — a drawer footer, a dialog's
   * action bar. Pair with `hideSubmitButton`; `hideSubmitButton` alone gives you a form
   * with no way to submit it.
   */
  onReady?: (handle: FormGeneratorHandle) => void;
  /**
   * A CROSS-FIELD rule, applied to the whole form as a `superRefine`.
   *
   * The per-field `zodSchema`s are composed into one object schema, so a rule spanning two
   * fields ("length, width and height must be given together") has nowhere to live — a
   * refinement baked into an entity schema in `@repo/types` is invisible here, because this
   * form never uses that schema. Pass the same refinement callback the entity schema uses
   * and both sides enforce ONE implementation, with the error landing inline on the named
   * field rather than arriving as a server-error toast.
   */
  refine?: (values: Record<string, unknown>, ctx: z.RefinementCtx) => void;
  /**
   * What the `steps` are.
   *
   * - `"wizard"` (default): a sequence to walk in order — only Continue advances, and view mode
   *   lays every step out on one page.
   * - `"sections"`: the sections of ONE long record (the Employee form's pages). Each step
   *   carries its label as a heading, the stepper's circles jump straight to any section, and
   *   view mode pages through them too — a record is read the way it is filled in.
   */
  stepMode?: "wizard" | "sections";
  /**
   * Called with the current values whenever any of them change.
   *
   * For side effects that watch the form without owning it — the Address master debounces
   * a "does this already exist?" lookup off it. NOT a way to control the form: the values
   * are already being watched for `hidden`, so this hands over what that subscription
   * sees rather than adding a second one. Keep the callback cheap or debounce it; it
   * fires on every keystroke.
   */
  onChange?: (values: Record<string, unknown>) => void;
}

/** A value the user has not filled in: nothing, blank text, or an empty selection. */
function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

// Tailwind's JIT can't see a template-literal class name, so grid spans need a static
// lookup — this is a real gotcha MUI's runtime `sx` grid spans never had to deal with.
const SPAN_CLASSES: Record<number, string> = {
  1: "sm:col-span-1",
  2: "sm:col-span-2",
  3: "sm:col-span-3",
  4: "sm:col-span-4",
  6: "sm:col-span-6",
  12: "sm:col-span-12",
};

/**
 * Whether an event came from inside THIS form's DOM. React bubbles events along the component
 * tree, portals included, so a form opened in a drawer from one of this form's fields (a
 * picker's quick-create) would otherwise submit — or step — this form too when Enter is pressed.
 */
function ownsEvent(event: React.SyntheticEvent<HTMLFormElement>): boolean {
  return event.target instanceof Node && event.currentTarget.contains(event.target);
}

function spanClass(maxWidgetsPerRow: number, spanToFullRow?: boolean): string {
  if (spanToFullRow) return SPAN_CLASSES[12]!;
  const span = Math.floor(12 / maxWidgetsPerRow) || 12;
  return SPAN_CLASSES[span] ?? SPAN_CLASSES[12]!;
}

function buildSchema(fields: FieldConfig[]): z.ZodObject<never> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of fields) {
    shape[field.id] = field.zodSchema ?? z.any();
  }
  return z.object(shape) as never;
}

/**
 * Replace every `null` with that field's default.
 *
 * An API row spells "no value" as `null`, while a form field spells it as `""` (or
 * `false`, or `[]`). Feeding the `null` straight in fails schemas written as
 * `.optional()` — `null` is neither a string nor `undefined` — and the form then refuses
 * to submit with NO visible error, because the field showing the problem is the one the
 * user never filled in. It also flips a controlled input to uncontrolled.
 */
function withoutNulls(
  values: Record<string, unknown>,
  defaults: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    out[key] = value === null ? (defaults[key] ?? "") : value;
  }
  return out;
}

function buildDefaults(fields: FieldConfig[]): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  for (const field of fields) {
    defaults[field.id] = field.initialValue ?? (field.fieldKind === "boolean" ? false : "");
  }
  return defaults;
}

/**
 * Whether the heading at `index` has a field under it (up to the next heading) that `isShown`
 * accepts. A heading over nothing is hidden with its fields, so a section never shows a title over
 * an empty grid.
 */
function headingHasShownField(
  fields: FieldConfig[],
  index: number,
  isShown: (field: FieldConfig) => boolean,
): boolean {
  for (let i = index + 1; i < fields.length && !fields[i]!.isSectionHeading; i++) {
    if (isShown(fields[i]!)) return true;
  }
  return false;
}

function FieldGrid({
  fields,
  maxWidgetsPerRow,
  form,
  disabled,
  values,
}: {
  fields: FieldConfig[];
  maxWidgetsPerRow: number;
  form: UseFormReturn<FieldValues>;
  disabled: boolean;
  values: Record<string, unknown>;
}) {
  // A heading whose fields are all hidden is hidden with them, so a section never shows a title
  // over nothing.
  const emptyHeadings = new Set<string>();
  fields.forEach((field, index) => {
    if (
      field.isSectionHeading &&
      !headingHasShownField(fields, index, (f) => !f.hidden?.(values))
    ) {
      emptyHeadings.add(field.id);
    }
  });

  return (
    <div className="grid grid-cols-12 gap-4">
      {fields.map((field) => {
        if (field.hidden?.(values) || emptyHeadings.has(field.id)) return null;
        return (
          <div
            key={field.id}
            /*
              A stable, locale-independent anchor for the field — its config id. The control inside
              carries an id from `React.useId()` (render-order dependent) and a translated label, so
              the validation summary's "Show me" finds the field through this instead.
            */
            data-field-id={field.id}
            className={cn(
              "col-span-12",
              spanClass(maxWidgetsPerRow, field.spanToFullRow),
              field.className,
            )}
          >
            {field.fieldKind === "custom" ? (
              field.renderCustom?.()
            ) : (
              <FormField
                control={form.control}
                name={field.id}
                render={({ field: rhfField, fieldState }) => (
                  <FormItem>
                    {/* The required asterisk is the only marker: an "Optional" tag on every other
                        field is noise on forms where most fields are optional. */}
                    {field.label && (
                      <FormLabel className="font-semibold">
                        {field.label}
                        {field.required && <span className="text-destructive"> *</span>}
                      </FormLabel>
                    )}
                    <FormControl>
                      {field.render?.({
                        value: rhfField.value,
                        onChange: rhfField.onChange,
                        onBlur: rhfField.onBlur,
                        error: fieldState.error?.message,
                        disabled,
                      }) ?? null}
                    </FormControl>
                    {field.description && <FormDescription>{field.description}</FormDescription>}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/** The layout a `steps` caller renders: one step per `StepConfig`, each a single section. */
function layoutFromSteps(steps: StepConfig[]): ResolvedFormLayout {
  return {
    steps: steps.map((step, index) => ({
      id: `step-${index}`,
      label: step.label ?? null,
      labelKey: null,
      sections: [
        { id: `step-${index}`, label: null, labelKey: null, fields: step.fields.map((f) => f.id) },
      ],
    })),
  };
}

/**
 * Schema-driven form, MobixFL's Form Builder. Declare `fields` (or `steps` for a wizard) as
 * configuration, not JSX; the form lays them out itself:
 *
 * - **Layout.** `fields` render as one page in declaration order, a `sectionField` heading starting
 *   each titled section (`resolveFormLayout`, `lib/form-layout.ts`). `steps` render as a wizard
 *   with a stepper, or as the pages of one long record with `stepMode="sections"`.
 * - **Validation.** Next checks the current step and names what stops it. Save is offered on every
 *   step and validates the whole form; a failure opens the "Can't save yet" summary, which names each
 *   step with a problem and its fields, jumps to the first and focuses the field. A server refusal
 *   that names fields lands in the same summary (`lib/form-server-errors.ts`).
 *
 * `submitPermission` gates the whole form rather than just the button: a user who cannot
 * submit gets the read-only rendering, because a form they can fill in and not save is
 * worse than one that never invited them to.
 *
 * (MobixFL also merges an admin's per-tenant Field Configuration, custom fields and stored layouts
 * in here; Wrapzzo has no such configuration, so those are not ported.)
 */
export function FormGenerator({
  maxWidgetsPerRow,
  onSubmit,
  mode = "create",
  fields,
  steps,
  values,
  hideCardWrapper,
  buttonAlignment = "start",
  hideSubmitButton,
  submitLabel,
  submitPermission,
  onReady,
  onChange,
  refine,
  stepMode = "wizard",
}: FormGeneratorProps) {
  const { t } = useTranslation();
  const { can } = usePermissions();

  const allFields = React.useMemo(
    () => (steps?.length ? steps.flatMap((step) => step.fields) : (fields ?? [])),
    [steps, fields],
  );
  const fieldById = React.useMemo(() => new Map(allFields.map((f) => [f.id, f])), [allFields]);

  const layout: ResolvedFormLayout = React.useMemo(() => {
    if (steps?.length) return layoutFromSteps(steps);
    const declared = fields ?? [];
    return resolveFormLayout({
      defaultLayout: null,
      override: null,
      fieldIds: declared.map((f) => f.id),
      isVisible: () => true,
    });
  }, [steps, fields]);

  const stepCount = layout.steps.length;
  const isStepperMode = stepCount > 1;

  const schema = React.useMemo(() => {
    const base = buildSchema(allFields);
    // `superRefine` returns a ZodEffects, which `zodResolver` accepts but which is no
    // longer a ZodObject — so only wrap when a rule was actually supplied.
    return refine ? base.superRefine((values, ctx) => refine(values, ctx)) : base;
  }, [allFields, refine]);
  const defaults = React.useMemo(() => buildDefaults(allFields), [allFields]);

  const form = useForm<FieldValues>({
    // The schema is built from runtime field configs, so its input/output types are not
    // statically known; the form runs on loose `FieldValues` by design.
    resolver: zodResolver(schema) as unknown as Resolver<FieldValues>,
    defaultValues: defaults,
  });

  // Subscribing to every value is what makes `hidden` reactive; the cost is one render
  // per keystroke, which is what a conditional-visibility form needs anyway.
  const watched = form.watch();

  // Report the watched values outward. Depends on the serialized form rather than the
  // object, which `form.watch()` recreates every render — without that this fires in a
  // loop for any parent that setStates in response.
  const watchedKey = JSON.stringify(watched);
  React.useEffect(() => {
    onChange?.(watched);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedKey]);

  /**
   * Load `values` when they change identity. Merged over the defaults so a partial
   * object (an API row missing the optional fields) does not leave those inputs
   * uncontrolled — React warns and the field stops tracking its own state.
   */
  React.useEffect(() => {
    if (!values) return;
    form.reset({ ...defaults, ...withoutNulls(values, defaults) });
    // `defaults`/`form` are stable for a given field list; re-running on `values`
    // identity is the intent — a fresh fetch of the same row SHOULD repopulate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values]);

  const [requestedStep, setActiveStep] = React.useState(0);
  // The steps can shrink under an open form (a screen passing fewer of them), so the step is
  // clamped rather than trusted.
  const activeStep = Math.min(requestedStep, Math.max(stepCount - 1, 0));
  const canSubmit = can(submitPermission);
  const isView = mode === "view" || !canSubmit;
  const isLastStep = activeStep >= stepCount - 1;

  /** After a failed save: the summary stays open, re-reading the live errors, until none is left. */
  const [summaryOpen, setSummaryOpen] = React.useState(false);
  /** After a refused Next: the fields on this step that stopped it. */
  const [stepNote, setStepNote] = React.useState<{ step: number; ids: string[] } | null>(null);
  const [pendingFocus, setPendingFocus] = React.useState<string | null>(null);
  const formRef = React.useRef<HTMLFormElement>(null);

  const errors = form.formState.errors;
  const errorKeys = Object.keys(errors);
  const summary = summarizeErrorsByStep(layout, errorKeys);
  const errorCounts = layout.steps.map(
    (_, index) => summary.steps.find((row) => row.stepIndex === index)?.fieldIds.length ?? 0,
  );

  const labelOf = React.useCallback((id: string) => fieldById.get(id)?.label || id, [fieldById]);
  const titleOf = (labelText: string | null, labelKey: string | null) =>
    labelText ?? (labelKey ? t(labelKey, { defaultValue: "" }) || null : null);
  const stepTitle = (index: number) => {
    const step = layout.steps[index];
    return step ? titleOf(step.label, step.labelKey) : null;
  };
  const splitByEmptiness = (ids: string[]) => {
    const live = form.getValues();
    return {
      missing: ids.filter((id) => isEmptyValue(live[id])).map(labelOf),
      invalid: ids.filter((id) => !isEmptyValue(live[id])).map(labelOf),
    };
  };

  // Closes once the last error is fixed. Only on that transition: the summary opens in the same
  // tick react-hook-form publishes the errors, so "open with none yet" is not "all fixed".
  const errorCountRef = React.useRef(0);
  React.useEffect(() => {
    if (summaryOpen && errorCountRef.current > 0 && errorKeys.length === 0) setSummaryOpen(false);
    errorCountRef.current = errorKeys.length;
  }, [summaryOpen, errorKeys.length]);

  // Focus (and bring into view) the field a jump was for, once its step is on screen. Through the
  // DOM rather than `setFocus`: a `render` field does not hand its input's ref to the form.
  React.useEffect(() => {
    if (!pendingFocus) return;
    const host = formRef.current?.querySelector<HTMLElement>(
      `[data-field-id="${CSS.escape(pendingFocus)}"]`,
    );
    host?.scrollIntoView?.({ block: "center", behavior: "smooth" });
    host
      ?.querySelector<HTMLElement>(
        'input:not([type="hidden"]), textarea, select, button, [tabindex]:not([tabindex="-1"])',
      )
      ?.focus({ preventScroll: true });
    setPendingFocus(null);
  }, [pendingFocus, activeStep]);

  const jumpTo = React.useCallback((stepIndex: number | null, fieldId: string) => {
    if (stepIndex !== null) setActiveStep(stepIndex);
    setPendingFocus(fieldId);
  }, []);

  /*
   * The LATEST `onSubmit`, read through a ref rather than closed over.
   *
   * `onReady` hands the parent a `submit()` from an effect keyed on `[isSubmitting, isDirty]`,
   * so a drawer footer holds whatever closure existed when those flags last changed. For a
   * handler that reads only `values` that is harmless — react-hook-form holds those live. It
   * stops being harmless the moment a screen's submit depends on state the FORM does not own,
   * which the inventory line grids are the first to do: a `render` field's rows live in the
   * page's own `useState`, so the footer sent the rows as they were on mount while the totals
   * strip, rebuilt every render, showed the current ones. A purchase order previewed ₹2832 and
   * saved with no lines at all.
   *
   * A ref rather than widening the effect's deps: re-running `onReady` on every render would
   * hand the parent a new handle each time, and `setHandle` in a parent's `useState` would
   * then loop.
   */
  const onSubmitRef = React.useRef(onSubmit);
  onSubmitRef.current = onSubmit;
  const layoutRef = React.useRef(layout);
  layoutRef.current = layout;

  /*
   * A submit already in flight swallows the next one. The Save button only disables after a
   * re-render, so a quick second click, or Enter pressed in a field, re-sent the same create:
   * the first saved the record and the second answered "already exists", an error toast over a
   * record that had in fact been added. A ref, because `formState.isSubmitting` is not
   * readable until that re-render.
   */
  const submittingRef = React.useRef(false);
  const handleSubmit = form.handleSubmit(
    async (submitted) => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      setStepNote(null);
      try {
        await onSubmitRef.current(submitted);
      } finally {
        submittingRef.current = false;
      }
    },
    /*
     * A save from any step validates the whole form, so a rule broken on another step would
     * otherwise refuse the save with nothing visible to fix. The summary names each step and its
     * fields; the form opens the first.
     */
    (failed) => {
      setSummaryOpen(true);
      setStepNote(null);
      const first = summarizeErrorsByStep(layoutRef.current, Object.keys(failed)).steps[0];
      if (first) jumpTo(first.stepIndex, first.fieldIds[0]!);
    },
  );

  /*
   * A server refusal naming fields of THIS form: mark them inline and open the summary, exactly as
   * a client-side failure does. The newest open form that owns a named field takes it — but only
   * while its own save is running (the screen's `onSubmit` reports the failure before it returns):
   * every failed request goes through `useApiErrorToast`, and a dialog's or a filter's 400 naming
   * a field this form happens to share must not be painted onto it.
   */
  React.useEffect(() => {
    if (mode === "filter") return;
    return registerFormServerErrorSink((fieldErrors) => {
      if (!submittingRef.current) return false;
      /*
       * A line's refusal comes keyed `lines.<i>.<field>`, which is no field of the form: the line
       * grid is ONE `lines` field the page draws by hand, and the page marks the line itself
       * (`lineServerErrors`). Folding those keys onto `lines` keeps the summary pointing at the
       * grid's step instead of the form declining the refusal and leaving only a toast.
       */
      const ownerOf = (key: string) =>
        fieldById.has(key)
          ? key
          : key.startsWith("lines.") && fieldById.has("lines")
            ? "lines"
            : undefined;
      const messages = new Map<string, string>();
      for (const [key, message] of Object.entries(fieldErrors)) {
        const owner = ownerOf(key);
        if (owner && !messages.has(owner)) messages.set(owner, message);
      }
      const owned = [...messages.keys()];
      if (owned.length === 0) return false;
      for (const key of owned) form.setError(key, { type: "server", message: messages.get(key) });
      setSummaryOpen(true);
      const first = summarizeErrorsByStep(layoutRef.current, owned).steps[0];
      if (first) jumpTo(first.stepIndex, first.fieldIds[0]!);
      return true;
    });
  }, [mode, fieldById, form, jumpTo]);

  const requestedStepRef = React.useRef(activeStep);
  requestedStepRef.current = activeStep;

  // Live values, not `watched`: the handle's `next` outlives the render that made it.
  const goToNextStep = async () => {
    const live = form.getValues();
    const current = Math.min(requestedStepRef.current, layoutRef.current.steps.length - 1);
    const ids = (layoutRef.current.steps[current]?.sections ?? [])
      .flatMap((section) => section.fields)
      .filter((id) => !fieldById.get(id)?.hidden?.(live));
    const valid = isView || (await form.trigger(ids));
    if (valid) {
      setStepNote(null);
      setActiveStep(Math.min(current + 1, layoutRef.current.steps.length - 1));
      return;
    }
    const failing = ids.filter((id) => form.getFieldState(id).invalid);
    setStepNote({ step: current, ids: failing });
    if (failing[0]) setPendingFocus(failing[0]);
  };
  /*
   * Enter in a field of a create wizard's earlier step moves on, as Continue does. Save sits on
   * every step, so the browser's implicit submit would otherwise validate the WHOLE form from
   * step 1 and answer with "Can't save yet" for steps the user has not reached. A textarea (a new
   * line), a control that handled Enter itself (a combobox picking an option) and an IME
   * composition keep their own meaning; the last step and an edit still save.
   */
  const continueOnEnter = (event: React.KeyboardEvent<HTMLFormElement>) => {
    if (!ownsEvent(event)) return;
    if (event.key !== "Enter" || event.defaultPrevented || event.nativeEvent.isComposing) return;
    if (mode !== "create" || !isStepperMode || isLastStep) return;
    if (!(event.target instanceof HTMLInputElement)) return;
    event.preventDefault();
    void goToNextStep();
  };
  // Handed to the parent so a drawer footer can drive the form. Re-run when the
  // submitting/dirty flags change so the parent's button can reflect them.
  const { isSubmitting, isDirty } = form.formState;
  const lastHandleRef = React.useRef<FormGeneratorHandle | null>(null);
  const onReadyRef = React.useRef(onReady);
  onReadyRef.current = onReady;
  React.useEffect(() => {
    const current: FormGeneratorHandle = {
      submit: () => handleSubmit(),
      reset: (next) => form.reset(next ? { ...defaults, ...next } : defaults),
      setValue: (name, value) =>
        form.setValue(name, value, { shouldDirty: true, shouldValidate: true }),
      // `getValues` reads react-hook-form's live store, so this stays current even though the
      // handle itself is only rebuilt when `isSubmitting`/`isDirty` change.
      getValues: () => form.getValues(),
      isSubmitting,
      isDirty,
      step: isStepperMode
        ? {
            index: activeStep,
            count: stepCount,
            next: () => void goToNextStep(),
            back: () => {
              setStepNote(null);
              setActiveStep((s) => Math.max(0, Math.min(s, stepCount - 1) - 1));
            },
            goTo: (index) => setActiveStep(index),
          }
        : undefined,
    };
    lastHandleRef.current = current;
    onReady?.(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSubmitting, isDirty, activeStep, stepCount]);

  /*
   * A form unmounted mid-submit never reports the submit settling, so the parent's stored handle
   * would keep `isSubmitting: true` — and a `MasterDrawer` reading it would stay undismissable,
   * X hidden and Cancel disabled, until some other form replaced the handle. Hand back a settled
   * copy on the way out. A copy rather than `null`, so no consumer's `onReady` type has to widen.
   */
  React.useEffect(
    () => () => {
      const last = lastHandleRef.current;
      if (last?.isSubmitting) onReadyRef.current?.({ ...last, isSubmitting: false });
    },
    [],
  );

  const defaultLabel =
    mode === "filter"
      ? t("action.applyFilters")
      : mode === "edit"
        ? t("action.update")
        : t("action.submit");

  const isSections = stepMode === "sections";

  /** One section: its heading (unless the step's own title already says it) and its fields. */
  const renderSection = (
    section: ResolvedFormSection,
    index: number,
    stepHeading: string | null,
  ) => {
    const sectionFields = section.fields
      .map((id) => fieldById.get(id))
      .filter((f): f is FieldConfig => Boolean(f));
    const title = titleOf(section.label, section.labelKey);
    const allHiddenByValue = sectionFields.every((f) => f.isSectionHeading || f.hidden?.(watched));
    const showHeading =
      Boolean(title) && !allHiddenByValue && !(index === 0 && title === stepHeading);
    return (
      <div
        key={section.id}
        // A titled section of a data-entry form sits on its own subtle surface, so the sections
        // read as groups; a filter or a page with no headings stays flat.
        className={cn(
          "space-y-4",
          showHeading && mode !== "filter" && "bg-card rounded-lg border p-4",
        )}
        data-section-id={section.id}
      >
        {showHeading && (
          // A record read as pages (the Employee drawer) heads them in the primary colour, and
          // its sub-headings match, so a section is found at a glance.
          <FormSectionHeader title={title!} className={cn(isSections && "text-primary")} />
        )}
        <FieldGrid
          fields={sectionFields}
          maxWidgetsPerRow={maxWidgetsPerRow}
          form={form}
          disabled={isView}
          values={watched}
        />
      </div>
    );
  };
  const renderStep = (index: number, stepHeading: string | null) => (
    <div className="space-y-6">
      {(layout.steps[index]?.sections ?? []).map((section, i) =>
        renderSection(section, i, stepHeading),
      )}
    </div>
  );

  const summaryRows: ValidationSummaryRow[] = summary.steps.map((row) => ({
    stepIndex: isStepperMode ? row.stepIndex : null,
    stepTitle: stepTitle(row.stepIndex),
    ...splitByEmptiness(row.fieldIds),
    firstFieldId: row.fieldIds[0]!,
  }));
  const generalMessages = summary.general.map((key) => {
    const message = (errors[key]?.message as string | undefined) ?? "";
    return fieldById.has(key) ? `${labelOf(key)}: ${message}` : message || key;
  });
  const visibleNote =
    stepNote && stepNote.step === activeStep
      ? splitByEmptiness(stepNote.ids.filter((id) => id in errors))
      : null;

  const stepLabels = layout.steps.map((_, index) => stepTitle(index) ?? "");
  const errorLabel = (count: number) => t("formValidation.stepBadge", { count });

  const content = (
    <div className="space-y-6">
      {isStepperMode && isSections && (
        // The labels do not fit under the circles in a drawer; the current one is the heading
        // below, and each circle is a jump named by its label.
        <div className="space-y-3">
          <Stepper
            steps={stepLabels}
            activeStep={activeStep}
            onStepClick={setActiveStep}
            errorCounts={errorCounts}
            errorLabel={errorLabel}
            hideLabels
          />
          <div className="flex items-baseline justify-between gap-2">
            {/* In the theme's primary colour, so a section is found at a glance. */}
            <h3 className="text-primary text-sm font-semibold">{stepLabels[activeStep]}</h3>
            <span className="text-muted-foreground shrink-0 text-xs">
              {t("state.stepOf", { current: activeStep + 1, total: stepCount })}
            </span>
          </div>
        </div>
      )}
      {isStepperMode && !isSections && !isView && (
        <Stepper
          steps={stepLabels}
          activeStep={activeStep}
          errorCounts={errorCounts}
          errorLabel={errorLabel}
          // The labels hang below the circles, outside the stepper's own box, so without this margin
          // the first field's label sits right against them. Two lines' worth, since a label wraps.
          className="mb-9"
          // Back is always free, and so is any step with a problem to fix. Forward is otherwise free
          // only when editing: the data is already whole. A new record still goes through each
          // step's checks with Continue.
          onStepClick={(index) => {
            if (index < activeStep || mode === "edit" || errorCounts[index]! > 0) {
              setStepNote(null);
              setActiveStep(index);
            }
          }}
        />
      )}

      {!isView && summaryOpen && (
        <FormValidationSummary
          rows={summaryRows}
          general={generalMessages}
          onGo={(row) => jumpTo(row.stepIndex, row.firstFieldId)}
        />
      )}
      {!isView && visibleNote && (
        <StepValidationNote missing={visibleNote.missing} invalid={visibleNote.invalid} />
      )}

      {isStepperMode && isView && !isSections ? (
        <div className="space-y-8">
          {layout.steps.map((step, index) => (
            <div key={step.id} className="space-y-4">
              {stepLabels[index] && <h3 className="text-sm font-semibold">{stepLabels[index]}</h3>}
              {renderStep(index, stepLabels[index] || null)}
            </div>
          ))}
        </div>
      ) : isStepperMode ? (
        <div
          key={layout.steps[activeStep]?.id}
          className="animate-in fade-in-0 slide-in-from-right-2 duration-150"
        >
          {renderStep(activeStep, stepLabels[activeStep] || null)}
        </div>
      ) : (
        // One step (or none): a single page, every section titled by its own heading.
        renderStep(0, null)
      )}

      {!isView && !hideSubmitButton && (
        <div
          className={cn(
            "flex gap-2",
            buttonAlignment === "end" && "justify-end",
            buttonAlignment === "center" && "justify-center",
          )}
        >
          {isStepperMode && activeStep > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setStepNote(null);
                setActiveStep(activeStep - 1);
              }}
            >
              {t("action.back")}
            </Button>
          )}
          {isStepperMode && !isLastStep && (
            <Button type="button" variant="outline" onClick={goToNextStep}>
              {t("action.continue")}
            </Button>
          )}
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
            {submitLabel ?? defaultLabel}
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <Form {...form}>
      <form
        ref={formRef}
        onSubmit={(event) => {
          // Another form's submit, bubbled here through a portal — not ours to send.
          if (!ownsEvent(event)) return;
          void handleSubmit(event);
        }}
        onKeyDown={continueOnEnter}
        noValidate
      >
        {hideCardWrapper ? (
          content
        ) : (
          <Card>
            <CardContent className="pt-6">{content}</CardContent>
          </Card>
        )}
      </form>
    </Form>
  );
}
