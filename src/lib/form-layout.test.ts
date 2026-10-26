import { describe, expect, it } from "vitest";

import fixtures from "./form-layout.fixtures.json";
import {
  buildLayoutLabelKey,
  FORM_LAYOUT_LIMITS,
  formLayoutSchema,
  layoutConfigFrom,
  layoutItemId,
  parseLayoutItemId,
  parseFormLayout,
  resolveFormLayout,
  summarizeErrorsByStep,
  type FormLayout,
  type ResolvedFormLayout,
} from "./form-layout";

/*
 * The cases live in `form-layout.fixtures.json`, carried over from MobixFL with this module so the
 * two implementations of these rules are pinned by the same cases.
 */
describe("resolveFormLayout (shared fixtures)", () => {
  for (const c of fixtures.resolve) {
    it(c.name, () => {
      const hidden = new Set<string>(c.hidden);
      const translations = c.translations as Record<string, string>;
      const hiddenLayout = new Set<string>(c.hiddenLayout);
      const resolved = resolveFormLayout({
        defaultLayout: c.defaultLayout as FormLayout | null,
        override: c.override,
        fieldIds: c.fieldIds,
        isVisible: (id) => !hidden.has(id),
        labelFor: (kind, id) => translations[`${kind}:${id}`],
        isLayoutHidden: (kind, id) => hiddenLayout.has(`${kind}:${id}`),
      });
      expect(resolved).toEqual(c.expected as ResolvedFormLayout);
    });
  }
});

describe("summarizeErrorsByStep (shared fixtures)", () => {
  for (const c of fixtures.summarize) {
    it(c.name, () => {
      expect(summarizeErrorsByStep(c.layout as ResolvedFormLayout, c.errorKeys)).toEqual(
        c.expected,
      );
    });
  }
});

describe("formLayoutSchema", () => {
  const section = (id: string, fields: string[] = []) => ({ id, fields });

  it("accepts a step and a section sharing an id, as the code defaults do", () => {
    expect(
      formLayoutSchema.safeParse({ steps: [{ id: "identity", sections: [section("identity")] }] })
        .success,
    ).toBe(true);
  });

  it("refuses a layout with no step, or a step with no section", () => {
    expect(formLayoutSchema.safeParse({ steps: [] }).success).toBe(false);
    expect(formLayoutSchema.safeParse({ steps: [{ id: "a", sections: [] }] }).success).toBe(false);
  });

  it(`refuses more than ${FORM_LAYOUT_LIMITS.steps} steps`, () => {
    const steps = Array.from({ length: FORM_LAYOUT_LIMITS.steps + 1 }, (_, i) => ({
      id: `s${i}`,
      sections: [section(`x${i}`)],
    }));
    expect(formLayoutSchema.safeParse({ steps }).success).toBe(false);
  });

  it("refuses an id with characters outside letters, digits, _ and -", () => {
    expect(
      formLayoutSchema.safeParse({ steps: [{ id: "a b", sections: [section("x")] }] }).success,
    ).toBe(false);
  });

  it("takes an English name, and refuses one that is not text or too long", () => {
    const withLabel = (label: unknown) =>
      formLayoutSchema.safeParse({ steps: [{ id: "a", label, sections: [section("x")] }] });
    expect(withLabel(" Basic ").data?.steps[0]?.label).toBe("Basic");
    expect(withLabel(42).success).toBe(false);
    expect(withLabel("x".repeat(FORM_LAYOUT_LIMITS.labelLength + 1)).success).toBe(false);
  });
});

describe("layout items in Field Configuration", () => {
  it("names a step or section's config id and parses it back", () => {
    expect(layoutItemId("section", "identity")).toBe("__section_identity");
    expect(parseLayoutItemId("__step_basic")).toEqual({ kind: "step", id: "basic" });
    expect(parseLayoutItemId("name")).toBeNull();
  });

  it("reads a translation for the language and hiding for the mode", () => {
    const config = layoutConfigFrom(
      {
        [buildLayoutLabelKey("step", "basic", "hi")]: "मूल विवरण",
        [`visible_${layoutItemId("section", "contact")}_create`]: false,
      },
      "create",
      "hi",
    );
    expect(config.labelFor?.("step", "basic")).toBe("मूल विवरण");
    expect(config.labelFor?.("section", "basic")).toBeNull();
    expect(config.isLayoutHidden?.("section", "contact")).toBe(true);
    expect(config.isLayoutHidden?.("step", "contact")).toBe(false);
  });

  it("needs no lookup for English: it is the layout's own name", () => {
    const config = layoutConfigFrom({ layoutLabel_step_basic__en: "Ignored" }, "edit", "en");
    expect(config.labelFor?.("step", "basic")).toBeNull();
  });
});

describe("parseFormLayout", () => {
  it("treats absent, blank and non-JSON values as no override", () => {
    expect(parseFormLayout(undefined)).toBeNull();
    expect(parseFormLayout(null)).toBeNull();
    expect(parseFormLayout("")).toBeNull();
    expect(parseFormLayout("[")).toBeNull();
    expect(parseFormLayout(42)).toBeNull();
  });
});
