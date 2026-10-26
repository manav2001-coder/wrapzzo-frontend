import { describe, expect, it } from "vitest";

import { renderWithProviders, screen } from "@/test/test-utils";
import { SectionCard } from "./section-card";

describe("SectionCard", () => {
  it("renders children with no header when no title is given", () => {
    renderWithProviders(<SectionCard>Body text</SectionCard>);
    expect(screen.getByText("Body text")).toBeInTheDocument();
  });

  it("renders title, description and actions", () => {
    renderWithProviders(
      <SectionCard
        title="Vehicle details"
        description="Registration and branch"
        actions={<button type="button">Edit</button>}
      >
        Body
      </SectionCard>,
    );
    expect(screen.getByText("Vehicle details")).toBeInTheDocument();
    expect(screen.getByText("Registration and branch")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });

  it("renders a footer", () => {
    renderWithProviders(<SectionCard footer={<span>Last updated today</span>}>Body</SectionCard>);
    expect(screen.getByText("Last updated today")).toBeInTheDocument();
  });

  it("swaps the body for a skeleton while loading", () => {
    renderWithProviders(
      <SectionCard title="Vehicle details" loading>
        Body
      </SectionCard>,
    );
    expect(screen.getByTestId("section-card-skeleton")).toBeInTheDocument();
    expect(screen.queryByText("Body")).not.toBeInTheDocument();
  });

  // The Card primitive bakes in `hover:shadow-sm`, so an unelevated SectionCard has to
  // actively opt out or `elevated={false}` would be a lie.
  it("opts out of the primitive's hover shadow unless elevated", () => {
    const { container, rerender } = renderWithProviders(<SectionCard>Body</SectionCard>);
    expect(container.firstElementChild).toHaveClass("hover:shadow-none");

    rerender(<SectionCard elevated>Body</SectionCard>);
    expect(container.firstElementChild).toHaveClass("shadow-md");
    expect(container.firstElementChild).not.toHaveClass("hover:shadow-none");
  });

  it("drops the border when border is false", () => {
    const { container } = renderWithProviders(<SectionCard border={false}>Body</SectionCard>);
    expect(container.firstElementChild).toHaveClass("border-transparent");
  });

  // border={false} alone must keep the card's own white surface -- several existing
  // consumers (the TBAC template-assign screens, the showcase's "Borderless" demo) rely on
  // just the border line disappearing. `transparent` is the separate, opt-in way to also
  // drop the surface for panels that want to blend into the page.
  it("keeps the card's own background when only border is false", () => {
    const { container } = renderWithProviders(<SectionCard border={false}>Body</SectionCard>);
    expect(container.firstElementChild).not.toHaveClass("bg-transparent");
  });

  it("drops the card's own background when transparent is set", () => {
    const { container } = renderWithProviders(
      <SectionCard border={false} transparent>
        Body
      </SectionCard>,
    );
    expect(container.firstElementChild).toHaveClass("bg-transparent");
  });

  it("renders children unpadded when padded is false", () => {
    renderWithProviders(
      <SectionCard title="T" padded={false} contentClassName="raw-body">
        Body
      </SectionCard>,
    );
    expect(screen.getByText("Body").closest(".raw-body")).not.toBeNull();
  });

  it("forwards a ref", () => {
    let node: HTMLDivElement | null = null;
    renderWithProviders(
      <SectionCard
        ref={(el) => {
          node = el;
        }}
      >
        Body
      </SectionCard>,
    );
    expect(node).toBeInstanceOf(HTMLDivElement);
  });
});
