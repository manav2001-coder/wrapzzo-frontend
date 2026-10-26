import { describe, expect, it } from "vitest";

import { screen } from "@testing-library/react";

import { renderWithProviders } from "@/test/test-utils";

import { Label } from "./label";

describe("Label", () => {
  it("is strong by default, so no screen has to bold its own labels", () => {
    renderWithProviders(<Label>Registration number</Label>);

    expect(screen.getByText("Registration number")).toHaveClass("font-semibold");
    expect(screen.getByText("Registration number")).not.toHaveClass("font-medium");
  });

  it("lets a caller override the weight for a deliberately quiet label", () => {
    renderWithProviders(<Label className="font-normal">Optional note</Label>);

    expect(screen.getByText("Optional note")).toHaveClass("font-normal");
    // tailwind-merge drops the default weight; two weights on one element would depend on stylesheet order.
    expect(screen.getByText("Optional note")).not.toHaveClass("font-semibold");
  });
});
