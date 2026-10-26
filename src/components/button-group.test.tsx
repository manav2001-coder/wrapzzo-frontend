import { describe, expect, it } from "vitest";

import { renderWithProviders, screen } from "@/test/test-utils";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "./button-group";

describe("ButtonGroup", () => {
  it("exposes a labelled group", () => {
    renderWithProviders(
      <ButtonGroup label="Row actions">
        <Button>Edit</Button>
        <Button>Delete</Button>
      </ButtonGroup>,
    );
    const group = screen.getByRole("group", { name: "Row actions" });
    expect(group).toHaveAttribute("aria-orientation", "horizontal");
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("switches to a vertical stack", () => {
    renderWithProviders(
      <ButtonGroup orientation="vertical" label="Row actions">
        <Button>Edit</Button>
      </ButtonGroup>,
    );
    expect(screen.getByRole("group")).toHaveAttribute("aria-orientation", "vertical");
    expect(screen.getByRole("group")).toHaveClass("flex-col");
  });

  // No cloneElement: children keep their own props, and non-Button children survive.
  it("does not alter its children", () => {
    renderWithProviders(
      <ButtonGroup>
        <Button variant="outline" size="sm">
          Edit
        </Button>
        <span data-testid="not-a-button">|</span>
      </ButtonGroup>,
    );
    expect(screen.getByRole("button", { name: "Edit" })).toHaveClass("h-8");
    expect(screen.getByTestId("not-a-button")).toBeInTheDocument();
  });
});
