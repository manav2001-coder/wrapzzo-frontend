import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithProviders } from "@/test/test-utils";
import { TableFilterPanel } from "./table-filter-panel";
import type { TableFilterField } from "./types";

const FIELDS: TableFilterField[] = [{ id: "branch", label: "Branch", type: "text" }];

const open = async () => {
  await userEvent.click(screen.getByRole("button", { name: /filters/i }));
};

describe("TableFilterPanel", () => {
  it("Apply calls onApply with the entered values", async () => {
    const onApply = vi.fn();
    renderWithProviders(
      <TableFilterPanel fields={FIELDS} activeFilters={{}} onApply={onApply} onClear={vi.fn()} />,
    );

    await open();
    await userEvent.type(screen.getByLabelText("Branch"), "Pune");
    await userEvent.click(screen.getByRole("button", { name: /apply/i }));

    await waitFor(() => expect(onApply).toHaveBeenCalledWith({ branch: "Pune" }));
  });

  it("Clear resets the draft and calls onClear", async () => {
    const onClear = vi.fn();
    renderWithProviders(
      <TableFilterPanel
        fields={FIELDS}
        activeFilters={{ branch: "Pune" }}
        onApply={vi.fn()}
        onClear={onClear}
      />,
    );

    await open();
    await userEvent.click(screen.getByRole("button", { name: /clear all/i }));

    expect(onClear).toHaveBeenCalled();
  });

  it("shows removable chips for active filters when collapsed", () => {
    renderWithProviders(
      <TableFilterPanel
        fields={FIELDS}
        activeFilters={{ branch: "Pune" }}
        onApply={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    expect(screen.getByText(/branch: pune/i)).toBeInTheDocument();
  });

  it("removing a chip re-applies the rest without that key", async () => {
    const onApply = vi.fn();
    renderWithProviders(
      <TableFilterPanel
        fields={[...FIELDS, { id: "zone", label: "Zone", type: "text" }]}
        activeFilters={{ branch: "Pune", zone: "West" }}
        onApply={onApply}
        onClear={vi.fn()}
      />,
    );

    const chip = screen.getByText(/branch: pune/i).closest("div")!;
    await userEvent.click(chip.querySelector("button")!);

    expect(onApply).toHaveBeenCalledWith({ branch: undefined, zone: "West" });
  });
});

/**
 * The reason the panel was rebuilt on `FormGenerator`.
 *
 * It used to render a plain `<Input>` for every declared type, so four of the five types were
 * unusable: a `select` was a free-text box, a `dateRange` was impossible, and no screen ever
 * wired the panel up at all.
 */
describe("each declared type renders its own control", () => {
  it("select renders a combobox over the declared options, not a text box", async () => {
    const onApply = vi.fn();
    renderWithProviders(
      <TableFilterPanel
        fields={[
          {
            id: "status",
            label: "Status",
            type: "select",
            options: [
              { value: "active", label: "Active" },
              { value: "retired", label: "Retired" },
            ],
          },
        ]}
        activeFilters={{}}
        onApply={onApply}
        onClear={vi.fn()}
      />,
    );

    await open();
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(await screen.findByText("Retired"));
    await userEvent.click(screen.getByRole("button", { name: /apply/i }));

    // The RAW value, not the option object — v4 stores the object and has to unwrap it on
    // apply, plus stash a `_label` twin so its chips can show a name.
    await waitFor(() => expect(onApply).toHaveBeenCalledWith({ status: "retired" }));
  });

  it("multiselect collects an array of raw values", async () => {
    const onApply = vi.fn();
    renderWithProviders(
      <TableFilterPanel
        fields={[
          {
            id: "zones",
            label: "Zones",
            type: "multiselect",
            options: [
              { value: "north", label: "North" },
              { value: "south", label: "South" },
            ],
          },
        ]}
        activeFilters={{}}
        onApply={onApply}
        onClear={vi.fn()}
      />,
    );

    await open();
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(await screen.findByText("North"));
    await userEvent.click(screen.getByRole("button", { name: /apply/i }));

    await waitFor(() => expect(onApply).toHaveBeenCalledWith({ zones: ["north"] }));
  });

  it("dateRange renders one range picker and applies a [from, to] pair", async () => {
    const onApply = vi.fn();
    renderWithProviders(
      <TableFilterPanel
        fields={[{ id: "createdAt", label: "Created", type: "dateRange" }]}
        activeFilters={{}}
        onApply={onApply}
        onClear={vi.fn()}
      />,
    );

    await open();
    // Inside a form the trigger's accessible name is its LABEL, not its placeholder text —
    // `FormLabel`'s `htmlFor` points at the control's injected id. That is the right name for
    // a labelled field, so the query follows it rather than the visible placeholder.
    await userEvent.click(screen.getByRole("button", { name: "Created" }));
    await userEvent.click(screen.getByRole("button", { name: "Today" }));
    await userEvent.click(screen.getByRole("button", { name: /apply filters/i }));

    await waitFor(() => {
      const [values] = onApply.mock.calls.at(-1)!;
      expect(Array.isArray((values as Record<string, unknown>).createdAt)).toBe(true);
    });
  });

  it("number renders a stepper control, not a free-text box", async () => {
    renderWithProviders(
      <TableFilterPanel
        fields={[{ id: "capacity", label: "Capacity", type: "number" }]}
        activeFilters={{}}
        onApply={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    await open();
    // `NumberInput` is an `inputMode="numeric"` box flanked by step buttons rather than a
    // native `input[type=number]`, so the affordance to assert on is the stepper.
    expect(screen.getByRole("button", { name: /increment/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /decrement/i })).toBeInTheDocument();
  });
});

describe("chips read from the options, not from a shadow label entry", () => {
  it("shows a select's LABEL for its stored raw value", () => {
    renderWithProviders(
      <TableFilterPanel
        fields={[
          {
            id: "status",
            label: "Status",
            type: "select",
            options: [{ value: "retired", label: "Retired" }],
          },
        ]}
        activeFilters={{ status: "retired" }}
        onApply={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    // "Retired", not "retired" — and with no `status_label` entry in the filter state.
    expect(screen.getByText("Status: Retired")).toBeInTheDocument();
  });

  it("formats a date range as one readable span", () => {
    renderWithProviders(
      <TableFilterPanel
        fields={[{ id: "createdAt", label: "Created", type: "dateRange" }]}
        activeFilters={{ createdAt: ["2026-01-01", "2026-01-31"] }}
        onApply={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    expect(screen.getByText("Created: 01 Jan – 31 Jan 2026")).toBeInTheDocument();
  });

  it("does not count an empty array as an active filter", () => {
    renderWithProviders(
      <TableFilterPanel
        fields={[{ id: "zones", label: "Zones", type: "multiselect", options: [] }]}
        activeFilters={{ zones: [] }}
        onApply={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    expect(screen.queryByText(/zones:/i)).not.toBeInTheDocument();
  });
});
