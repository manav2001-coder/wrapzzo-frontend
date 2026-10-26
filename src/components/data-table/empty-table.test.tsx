import { describe, expect, it } from "vitest";

import { render, screen } from "@/test/test-utils";
import { EmptyTable } from "./empty-table";

describe("EmptyTable", () => {
  it("renders the default message", () => {
    render(<EmptyTable />);
    expect(screen.getByText("No results.")).toBeInTheDocument();
  });

  it("renders a custom message and description", () => {
    render(<EmptyTable message="No vehicles" description="Add one to get started." />);
    expect(screen.getByText("No vehicles")).toBeInTheDocument();
    expect(screen.getByText("Add one to get started.")).toBeInTheDocument();
  });

  it("renders a custom icon in place of the default", () => {
    render(<EmptyTable icon={<span data-testid="custom-icon" />} />);
    expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
  });

  it("renders an action", () => {
    render(<EmptyTable action={<button type="button">Create the first one</button>} />);
    expect(screen.getByRole("button", { name: "Create the first one" })).toBeInTheDocument();
  });
});
