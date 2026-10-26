import * as React from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithProviders as render } from "@/test/test-utils";
import {
  type ColumnDef,
  type ColumnFiltersState,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { Filter } from "./filter";
import "./types";

interface Row {
  status: string;
}

function Harness({ meta }: { meta: Record<string, unknown> }) {
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const columns: ColumnDef<Row, unknown>[] = [{ accessorKey: "status", header: "Status", meta }];
  const table = useReactTable({
    data: [],
    columns,
    state: { columnFilters },
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div>
      <Filter column={table.getColumn("status")!} />
      <span data-testid="filter-value">
        {JSON.stringify(table.getColumn("status")!.getFilterValue() ?? null)}
      </span>
    </div>
  );
}

describe("Filter", () => {
  it("keeps bounded numeric filters wide enough for multi-digit values", async () => {
    render(<Harness meta={{ filterVariant: "numberRange", numberProps: { min: 0, max: 9 } }} />);
    const inputs = screen.getAllByRole("spinbutton");
    for (const input of inputs) {
      expect(input).toHaveClass("w-28");
      expect(input).not.toHaveClass("absolute");
      expect(input.parentElement?.querySelector('span[aria-hidden="true"]')).toBeNull();
    }
    fireEvent.change(inputs[0]!, { target: { value: "123456" } });
    await waitFor(() =>
      expect(screen.getByTestId("filter-value")).toHaveTextContent('["123456",""]'),
    );
  });

  it("text variant: typing updates the column filter value after the debounce delay", async () => {
    render(<Harness meta={{ filterVariant: "text" }} />);

    fireEvent.change(screen.getByPlaceholderText("Search Status"), {
      target: { value: "active" },
    });
    await waitFor(() => expect(screen.getByTestId("filter-value")).toHaveTextContent('"active"'), {
      timeout: 2000,
    });
  });

  it("names the text box after its own column, not a generic 'Filter…'", () => {
    // v4's pattern. With eight boxes in a row, "Search Code" is the only thing that says
    // which column a box belongs to once the header has scrolled past.
    render(<Harness meta={{ filterVariant: "text" }} />);
    expect(screen.getByPlaceholderText("Search Status")).toBeInTheDocument();
  });

  it("does NOT fire a filter change on mount", async () => {
    // The debounce effect runs on first render too, so every filter input used to schedule a
    // spurious change one debounce after appearing — N wasted refetches per table, each one
    // also resetting the page the user was already on.
    render(<Harness meta={{ filterVariant: "text" }} />);
    await new Promise((resolve) => setTimeout(resolve, 700));
    expect(screen.getByTestId("filter-value")).toHaveTextContent("null");
  });

  it("dateRange variant renders one range picker, not two native date inputs", () => {
    render(<Harness meta={{ filterVariant: "dateRange" }} />);
    expect(screen.getByRole("button", { name: /pick a date range/i })).toBeInTheDocument();
    expect(document.querySelectorAll('input[type="date"]')).toHaveLength(0);
  });

  it("select variant renders the configured options", () => {
    render(
      <Harness
        meta={{ filterVariant: "select", filterOptions: [{ value: "active", label: "Active" }] }}
      />,
    );
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("multiselect variant toggles a value into the filter array", async () => {
    render(
      <Harness
        meta={{
          filterVariant: "multiselect",
          filterOptions: [{ value: "active", label: "Active" }],
        }}
      />,
    );

    await userEvent.click(screen.getByRole("checkbox", { name: "Active" }));
    expect(screen.getByTestId("filter-value")).toHaveTextContent('["active"]');
  });

  it("numberRange variant updates the min/max tuple", async () => {
    render(<Harness meta={{ filterVariant: "numberRange" }} />);

    const inputs = screen.getAllByRole("spinbutton");
    expect(inputs).toHaveLength(2);
    fireEvent.change(inputs[0]!, { target: { value: "5" } });
    await waitFor(() => expect(screen.getByTestId("filter-value")).toHaveTextContent('["5",""]'), {
      timeout: 2000,
    });
  });

  it("numberRange shows no magnifying glass - a search icon in a 'Min' box reads as a bug", () => {
    render(<Harness meta={{ filterVariant: "numberRange" }} />);
    expect(document.querySelectorAll(".lucide-search")).toHaveLength(0);
  });
});

describe("Filter: a select whose default view is not 'everything'", () => {
  // The shared Status column hides inactive rows by default, so its unfiltered state must not
  // be labelled "All" — that promised both and delivered half.
  const meta = {
    filterVariant: "select",
    filterUnsetLabel: "Active",
    filterOptions: [
      { value: false, label: "Inactive" },
      { value: "__allStatuses__", label: "All" },
    ],
  };

  it("labels the untouched state with the column's own wording, not 'All'", () => {
    render(<Harness meta={meta} />);
    expect(screen.getByRole("combobox")).toHaveTextContent("Active");
    expect(screen.getByRole("combobox")).not.toHaveTextContent("All");
  });

  it("offers Active, Inactive and All, and All is a real value rather than a clear", async () => {
    render(<Harness meta={meta} />);
    await userEvent.click(screen.getByRole("combobox"));
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Active",
      "Inactive",
      "All",
    ]);

    await userEvent.click(screen.getByRole("option", { name: "All" }));
    expect(screen.getByTestId("filter-value")).toHaveTextContent("__allStatuses__");

    // And picking the default again goes back to NO filter.
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(screen.getByRole("option", { name: "Active" }));
    expect(screen.getByTestId("filter-value")).toHaveTextContent("null");
  });

  it("still says 'All' for an ordinary select that sets no unset label", async () => {
    render(
      <Harness meta={{ filterVariant: "select", filterOptions: [{ value: "x", label: "X" }] }} />,
    );
    expect(screen.getByRole("combobox")).toHaveTextContent("All");
  });
});
