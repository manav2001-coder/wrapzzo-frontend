import { describe, expect, it } from "vitest";

import type { ListFieldMap } from "@/lib/list-fields";
import { defaultFilterVariant, fieldNameOf, isSortableKind, kindOf } from "./list-field-policy";

/** The kinds the gift catalogue screens declare, standing in for one entity's list map. */
const LIST_FIELDS: Record<"gift", ListFieldMap> = {
  gift: { code: "text", name: "text", active: "boolean", addedOn: "date", vendorId: "id", category: "enum" },
};

describe("defaultFilterVariant", () => {
  it("gives free text a contains box, numbers a range and dates a range", () => {
    expect(defaultFilterVariant("text", false)).toBe("text");
    expect(defaultFilterVariant("number", false)).toBe("numberRange");
    expect(defaultFilterVariant("date", false)).toBe("dateRange");
  });

  it("offers a select for enum/boolean ONLY when the screen supplied options", () => {
    // Without options v4 falls through to a text input, which puts a substring search on a
    // constrained column. Rendering nothing is the honest answer.
    expect(defaultFilterVariant("enum", false)).toBeUndefined();
    expect(defaultFilterVariant("boolean", false)).toBeUndefined();
    expect(defaultFilterVariant("enum", true)).toBe("select");
    expect(defaultFilterVariant("boolean", true)).toBe("select");
  });

  it("offers NO filter for a uuid FK, even with options", () => {
    // A `contains` against a uuid can only ever match nothing.
    expect(defaultFilterVariant("id", true)).toBeUndefined();
  });

  it("offers no filter for a field the server does not publish", () => {
    expect(defaultFilterVariant(undefined, true)).toBeUndefined();
  });
});

describe("isSortableKind", () => {
  it("sorts everything the server can order by except a uuid", () => {
    for (const kind of ["text", "number", "date", "boolean", "enum"] as const) {
      expect(isSortableKind(kind)).toBe(true);
    }
    expect(isSortableKind("id")).toBe(false);
    expect(isSortableKind(undefined)).toBe(false);
  });
});

describe("fieldNameOf", () => {
  it("prefers meta.filterField, so a column can display one field and filter another", () => {
    expect(fieldNameOf({ id: "franchiseId", meta: { filterField: "franchiseName" } })).toBe(
      "franchiseName",
    );
  });

  it("falls back to the id react-table derives from accessorKey", () => {
    // The old lookup compared `column.id` only, so every accessorKey-only column lost its
    // variant and got the wrong operator.
    expect(fieldNameOf({ accessorKey: "regNo" })).toBe("regNo");
    expect(fieldNameOf({ id: "code", accessorKey: "code" })).toBe("code");
    expect(fieldNameOf({})).toBeUndefined();
  });

  it("ignores a non-string accessorKey (an accessor function)", () => {
    expect(fieldNameOf({ accessorKey: (() => "x") as unknown })).toBeUndefined();
  });
});

describe("kindOf", () => {
  it("reads the declared kind for a listed field", () => {
    expect(kindOf(LIST_FIELDS.gift, "code")).toBe("text");
    expect(kindOf(LIST_FIELDS.gift, "active")).toBe("boolean");
    expect(kindOf(LIST_FIELDS.gift, "addedOn")).toBe("date");
    expect(kindOf(LIST_FIELDS.gift, "vendorId")).toBe("id");
  });

  it("is undefined for an unlisted field or no map at all", () => {
    expect(kindOf(LIST_FIELDS.gift, "updatedByName")).toBeUndefined();
    expect(kindOf(undefined, "code")).toBeUndefined();
    expect(kindOf(LIST_FIELDS.gift, undefined)).toBeUndefined();
  });
});

describe("the map and the policy agree", () => {
  it("gives text columns a search box, and none to a column the map leaves out", () => {
    const fields = LIST_FIELDS.gift;
    expect(defaultFilterVariant(kindOf(fields, "code"), false)).toBe("text");
    expect(defaultFilterVariant(kindOf(fields, "name"), false)).toBe("text");
    expect(defaultFilterVariant(kindOf(fields, "updatedByName"), false)).toBeUndefined();
  });

  it("makes an enum with options a select", () => {
    expect(defaultFilterVariant(kindOf(LIST_FIELDS.gift, "category"), true)).toBe("select");
  });
});
