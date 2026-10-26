import { z } from "zod";

import type { Locale } from "@/lib/i18n";

/**
 * Form layout — the steps, and the sections inside each step, a form's fields are arranged into.
 *
 * Field Configuration decides WHETHER a field shows; this decides WHERE. A form declares its fields
 * by id and the form component (the web's `FormGenerator`, the app's `ConfigurableForm`) lays them
 * out from the resolved layout, so no screen hand-writes steps or section headings.
 *
 * The rules live HERE and nowhere else on the web. The mobile app carries a byte-for-byte port
 * (`mobixfl-mobile/lib/core/config/form_layout.dart`), and both run the same fixture table
 * (`form-layout.fixtures.json`), so the two platforms cannot drift on what a layout renders as.
 *
 * The layout is LANGUAGE-AGNOSTIC: it carries one English name per step or section, never a
 * translation. Translations, and showing or hiding a whole step or section per mode, are Field
 * Configuration overrides like any field's ({@link buildLayoutLabelKey}, and the `visible` key of
 * {@link layoutItemId}) — the layout says WHERE, Field Configuration says WHETHER and WHAT IT IS
 * CALLED, so adding a language never means editing a layout.
 *
 * Two sources feed a layout:
 * - the DEFAULT, declared in code (`FieldRegistryModule.layout` for the web,
 *   `MOBILE_FORM_LAYOUTS` for the app) and equal to how the form looked before layouts existed;
 * - an admin OVERRIDE, stored per namespace and per platform under {@link buildFormLayoutKey}.
 */

export interface FormLayoutSection {
  /** Stable across saves; what a later release uses to find "this field's default section". */
  id: string;
  /** The admin's ENGLISH name; other languages are Field Configuration's. Wins over {@link labelKey}. */
  label?: string;
  /** An i18n key (`masters:user.sections.identity`) — how a code-declared default names itself. */
  labelKey?: string;
  /** Field ids in display order: a registry field, a special control, or a custom field. */
  fields: string[];
}

export interface FormLayoutStep {
  id: string;
  label?: string;
  labelKey?: string;
  sections: FormLayoutSection[];
}

export interface FormLayout {
  steps: FormLayoutStep[];
  /**
   * Fields the admin took OFF the form (the editor's "Not on the form"). Without this list a field
   * the layout does not place is re-homed to its default section (rule 3 of `resolveFormLayout`) —
   * right for a field a later release adds, wrong for one an admin removed on purpose.
   */
  offForm?: string[];
}

/** The stored override key — one per namespace (and per platform, by the row's own `platform`). */
export function buildFormLayoutKey(): string {
  return "__form_layout";
}

export type FormLayoutItemKind = "step" | "section";

/**
 * The id a step or section is configured under in Field Configuration — `__step_<id>` /
 * `__section_<id>`. The leading `__` keeps it clear of every field id; its `visible` key is the
 * ordinary per-field one (`visible___section_identity_create`).
 */
export function layoutItemId(kind: FormLayoutItemKind, id: string): string {
  return `__${kind}_${id}`;
}

/** `__section_identity` → `{ kind: "section", id: "identity" }`; null for any other id. */
export function parseLayoutItemId(itemId: string): { kind: FormLayoutItemKind; id: string } | null {
  const match = /^__(step|section)_(.+)$/.exec(itemId);
  return match ? { kind: match[1] as FormLayoutItemKind, id: match[2]! } : null;
}

/**
 * A step's or section's name in one language — ONE key for every mode (a step is called the same
 * when adding and when editing), unlike a field label's per-mode key. English is the layout's own
 * name, so this key exists for the other languages.
 */
export function buildLayoutLabelKey(kind: FormLayoutItemKind, id: string, locale: Locale): string {
  return `layoutLabel_${kind}_${id}__${locale}`;
}

/** Bounds on a stored layout. Generous for a real form; they exist so a stored value stays small. */
export const FORM_LAYOUT_LIMITS = {
  steps: 10,
  sections: 40,
  fields: 300,
  labelLength: 80,
} as const;

const idSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/, "Invalid layout id");
/**
 * An English name. A per-language object (`{ en, hi }`, how layouts were briefly stored while the
 * feature was in development) is read as its English, so such a row degrades instead of failing.
 */
const labelSchema = z.preprocess(
  (value) =>
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>).en
      : value,
  z.string().trim().max(FORM_LAYOUT_LIMITS.labelLength).optional(),
);

const sectionSchema = z.object({
  id: idSchema,
  label: labelSchema,
  labelKey: z.string().max(120).optional(),
  fields: z.array(z.string().min(1).max(80)).max(FORM_LAYOUT_LIMITS.fields),
});

const stepSchema = z.object({
  id: idSchema,
  label: labelSchema,
  labelKey: z.string().max(120).optional(),
  sections: z.array(sectionSchema).min(1).max(FORM_LAYOUT_LIMITS.sections),
});

/**
 * What a stored override must be. Validated by the API on save and import, and again here on read,
 * so a row that predates a rule (or was written by hand) degrades to the default instead of
 * breaking a form.
 */
export const formLayoutSchema = z
  .object({
    steps: z.array(stepSchema).min(1).max(FORM_LAYOUT_LIMITS.steps),
    offForm: z.array(z.string().min(1).max(80)).max(FORM_LAYOUT_LIMITS.fields).optional(),
  })
  .superRefine((layout, ctx) => {
    const sections = layout.steps.flatMap((step) => step.sections);
    if (sections.length > FORM_LAYOUT_LIMITS.sections) {
      ctx.addIssue({ code: "custom", message: `At most ${FORM_LAYOUT_LIMITS.sections} sections` });
    }
    if (sections.flatMap((s) => s.fields).length > FORM_LAYOUT_LIMITS.fields) {
      ctx.addIssue({ code: "custom", message: `At most ${FORM_LAYOUT_LIMITS.fields} fields` });
    }
    const stepIds = layout.steps.map((s) => s.id);
    const sectionIds = sections.map((s) => s.id);
    if (
      new Set(stepIds).size !== stepIds.length ||
      new Set(sectionIds).size !== sectionIds.length
    ) {
      ctx.addIssue({ code: "custom", message: "Step ids, and section ids, must each be unique" });
    }
  });

/** One section as a form renders it: its name already resolved for the current language. */
export interface ResolvedFormSection {
  id: string;
  /**
   * The name in the current language: Field Configuration's translation, else the layout's English
   * name; `null` when it has neither.
   */
  label: string | null;
  /** The code default's i18n key, for the renderer to translate when {@link label} is null. */
  labelKey: string | null;
  fields: string[];
}

export interface ResolvedFormStep {
  id: string;
  label: string | null;
  labelKey: string | null;
  sections: ResolvedFormSection[];
}

export interface ResolvedFormLayout {
  steps: ResolvedFormStep[];
}

export interface ResolveFormLayoutInput {
  /** The code-declared layout. `null`: one untitled step holding one untitled section. */
  defaultLayout: FormLayout | null;
  /** The stored override as read from config — an object, a JSON string, or anything else. */
  override: unknown;
  /** EVERY field id the form has, in the order the screen declares them. */
  fieldIds: readonly string[];
  /**
   * Whether a field shows, from Field Configuration (and anything else STATIC, like a permission).
   * Never a value-dependent rule: those hide in place, so steps never re-pack while someone types.
   */
  isVisible: (fieldId: string) => boolean;
  /** Field Configuration's name for a step or section in the CURRENT language, if it has one. */
  labelFor?: (kind: FormLayoutItemKind, id: string) => string | null | undefined;
  /** Whether Field Configuration hides a whole step or section in the current mode. */
  isLayoutHidden?: (kind: FormLayoutItemKind, id: string) => boolean;
}

/** The layout a form with no declared default gets: one step, one section, the screen's order. */
function implicitLayout(fieldIds: readonly string[]): FormLayout {
  return { steps: [{ id: "main", sections: [{ id: "main", fields: [...fieldIds] }] }] };
}

/** An override as a validated layout, or `null` when it is absent or not a valid layout. */
export function parseFormLayout(raw: unknown): FormLayout | null {
  if (raw === undefined || raw === null || raw === "") return null;
  let value = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  const parsed = formLayoutSchema.safeParse(value);
  return parsed.success ? (parsed.data as FormLayout) : null;
}

/**
 * Field Configuration's step and section settings for one form, read from the namespace's
 * overrides — the `labelFor` / `isLayoutHidden` pair {@link resolveFormLayout} takes. `mode` is the
 * form's create or edit (or view); `locale` the current language. English needs no lookup: it is the
 * layout's own name.
 */
export function layoutConfigFrom(
  overrides: Record<string, unknown>,
  mode: string,
  locale: Locale,
): Pick<ResolveFormLayoutInput, "labelFor" | "isLayoutHidden"> {
  return {
    labelFor: (kind, id) => {
      if (locale === "en") return null;
      const value = overrides[buildLayoutLabelKey(kind, id, locale)];
      return typeof value === "string" && value.trim() ? value.trim() : null;
    },
    isLayoutHidden: (kind, id) => overrides[`visible_${layoutItemId(kind, id)}_${mode}`] === false,
  };
}

function nameOf(
  labelFor: ResolveFormLayoutInput["labelFor"],
  kind: FormLayoutItemKind,
  id: string,
  english: string | undefined,
): string | null {
  return labelFor?.(kind, id)?.trim() || english?.trim() || null;
}

/**
 * The layout a form renders. The ONE place these rules live (mirrored in Dart):
 *
 * 1. A missing or invalid override means the default. A bad config never breaks a form.
 * 2. Ids the form does not have are ignored; an id placed twice keeps its first place. A field the
 *    layout lists as off the form (`offForm`) is not shown, wherever else it appears.
 * 3. A field the layout does not place (added by a later release, or a custom field created after
 *    the layout was saved) goes to the section that holds it by default, if the layout still has
 *    that section; otherwise to the end of the last section. A field never silently disappears.
 * 4. A step or section Field Configuration hides is removed WITH its fields. Then hidden fields are
 *    removed, then sections left empty, then steps left empty.
 * 5. A name is Field Configuration's translation in the current language, else the layout's English
 *    name; with neither, the default's i18n key when the id matches one.
 */
export function resolveFormLayout(input: ResolveFormLayoutInput): ResolvedFormLayout {
  const { fieldIds, isVisible, labelFor } = input;
  const isLayoutHidden = input.isLayoutHidden ?? (() => false);
  const fallback = input.defaultLayout ?? implicitLayout(fieldIds);
  const layout = parseFormLayout(input.override) ?? fallback;

  const known = new Set(fieldIds);
  const defaultSectionOf = new Map<string, string>();
  // Two maps: a default step and its first section often share an id ("identity").
  const defaultStepKeys = new Map<string, string>();
  const defaultSectionKeys = new Map<string, string>();
  for (const step of fallback.steps) {
    if (step.labelKey) defaultStepKeys.set(step.id, step.labelKey);
    for (const section of step.sections) {
      if (section.labelKey) defaultSectionKeys.set(section.id, section.labelKey);
      for (const field of section.fields) {
        if (!defaultSectionOf.has(field)) defaultSectionOf.set(field, section.id);
      }
    }
  }

  // Off the form counts as placed — nowhere — so rule 3 never brings it back.
  const placed = new Set<string>(layout.offForm ?? []);
  const steps = layout.steps.map((step) => ({
    id: step.id,
    label: nameOf(labelFor, "step", step.id, step.label),
    labelKey: step.labelKey ?? defaultStepKeys.get(step.id) ?? null,
    sections: step.sections.map((section) => ({
      id: section.id,
      label: nameOf(labelFor, "section", section.id, section.label),
      labelKey: section.labelKey ?? defaultSectionKeys.get(section.id) ?? null,
      fields: section.fields.filter((field) => {
        if (!known.has(field) || placed.has(field)) return false;
        placed.add(field);
        return true;
      }),
    })),
  }));

  const sectionsById = new Map(steps.flatMap((step) => step.sections.map((s) => [s.id, s])));
  const lastSection = steps.at(-1)?.sections.at(-1);
  for (const field of fieldIds) {
    if (placed.has(field)) continue;
    placed.add(field);
    const home = sectionsById.get(defaultSectionOf.get(field) ?? "") ?? lastSection;
    home?.fields.push(field);
  }

  // Placement first, hiding after: a field in a hidden section is PLACED there (and so hidden with
  // it), never re-homed to a section that shows.
  return {
    steps: steps
      .filter((step) => !isLayoutHidden("step", step.id))
      .map((step) => ({
        ...step,
        sections: step.sections
          .filter((section) => !isLayoutHidden("section", section.id))
          .map((section) => ({ ...section, fields: section.fields.filter(isVisible) }))
          .filter((section) => section.fields.length > 0),
      }))
      .filter((step) => step.sections.length > 0),
  };
}

/** One step's share of a failed save — what the "Can't save yet" summary lists, in step order. */
export interface StepErrorSummary {
  /** Zero-based index into the RESOLVED steps (what the stepper shows). */
  stepIndex: number;
  stepId: string;
  /** Field ids with an error on this step, in their display order. */
  fieldIds: string[];
}

export interface FormErrorSummary {
  steps: StepErrorSummary[];
  /** Error keys no rendered field owns (a form-wide rule, a hidden field) — shown as general rows. */
  general: string[];
}

/**
 * Groups a failed save's error keys by the step that holds each field, so a form can say exactly
 * where to go ("Step 3 · Validity: 2 mandatory fields are empty"). Fields keep display order, steps
 * keep step order; a key no step holds is returned in {@link FormErrorSummary.general}.
 */
export function summarizeErrorsByStep(
  layout: ResolvedFormLayout,
  errorKeys: Iterable<string>,
): FormErrorSummary {
  const failing = new Set(errorKeys);
  const owned = new Set<string>();
  const steps: StepErrorSummary[] = [];
  layout.steps.forEach((step, stepIndex) => {
    const fieldIds = step.sections.flatMap((s) => s.fields).filter((id) => failing.has(id));
    fieldIds.forEach((id) => owned.add(id));
    if (fieldIds.length > 0) steps.push({ stepIndex, stepId: step.id, fieldIds });
  });
  return { steps, general: [...failing].filter((key) => !owned.has(key)) };
}
