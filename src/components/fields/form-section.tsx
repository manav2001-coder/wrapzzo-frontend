import type { FieldConfig } from "@/components/fields/form-generator";
import { FormSectionHeader } from "@/components/fields/form-section-header";

/**
 * A section heading inside a FLAT form's field list — the one shared helper, replacing the copies
 * each master page used to declare for itself.
 *
 * Marked `isSectionHeading`, so `FormGenerator` can tell a heading from a field: it hides one whose
 * fields are all hidden (no orphan heading), and drops them all once an admin has arranged the form
 * in Field Configuration, where the layout's own sections take over. A stepped form does not use
 * this at all; its sections come from the layout (`FieldRegistryModule.layout`).
 */
export function sectionField(id: string, title: string, hidden?: () => boolean): FieldConfig {
  return {
    id,
    fieldKind: "custom",
    spanToFullRow: true,
    isSectionHeading: true,
    hidden,
    // No zod entry means `z.any()`, and the value is never read: this exists only to draw a heading.
    renderCustom: () => <FormSectionHeader title={title} className="mt-2" />,
  };
}
