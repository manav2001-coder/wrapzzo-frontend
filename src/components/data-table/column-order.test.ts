import { describe, expect, it } from "vitest";

import { moveColumn, reconcileOrder } from "./column-order";

describe("reconcileOrder", () => {
  it("is the table's own order when nothing is saved", () => {
    expect(reconcileOrder([], ["a", "b", "c"])).toEqual(["a", "b", "c"]);
  });

  it("applies the saved order", () => {
    expect(reconcileOrder(["c", "a", "b"], ["a", "b", "c"])).toEqual(["c", "a", "b"]);
  });

  it("drops columns that no longer exist", () => {
    expect(reconcileOrder(["gone", "b", "a"], ["a", "b"])).toEqual(["b", "a"]);
  });

  it("appends columns the saved order never saw, in the table's order", () => {
    expect(reconcileOrder(["b", "a"], ["a", "b", "x", "y"])).toEqual(["b", "a", "x", "y"]);
  });

  it("ignores a duplicated id", () => {
    expect(reconcileOrder(["a", "a", "b"], ["a", "b"])).toEqual(["a", "b"]);
  });
});

describe("moveColumn", () => {
  it("moves a column forward and backward", () => {
    expect(moveColumn(["a", "b", "c", "d"], "a", "c")).toEqual(["b", "c", "a", "d"]);
    expect(moveColumn(["a", "b", "c", "d"], "d", "b")).toEqual(["a", "d", "b", "c"]);
  });

  it("leaves the order alone for an unknown id or a drop on itself", () => {
    expect(moveColumn(["a", "b"], "x", "a")).toEqual(["a", "b"]);
    expect(moveColumn(["a", "b"], "a", "a")).toEqual(["a", "b"]);
  });

  it("does not mutate its input", () => {
    const order = ["a", "b", "c"];
    moveColumn(order, "a", "c");
    expect(order).toEqual(["a", "b", "c"]);
  });
});
