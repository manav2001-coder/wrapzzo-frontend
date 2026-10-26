import { describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ColumnDef } from "@tanstack/react-table";
import type { ListFieldMap } from "@/lib/list-fields";
import type { FetchOptions } from "@/components/data-table/types";
import { renderWithProviders } from "@/test/test-utils";
import { DataTable } from "./data-table";

interface Row {
  id: string;
  code: string;
  name: string;
  active: boolean;
  cityId: string;
  addedOn: string;
}

/**
 * A stand-in for one entity's `LIST_FIELDS` entry, exercising every kind that behaves
 * differently: text (a box), boolean (options-driven), date (a range), id (nothing at all).
 */
const listFields: ListFieldMap = {
  code: "text",
  name: "text",
  active: "boolean",
  cityId: "id",
  addedOn: "date",
};

const columns: ColumnDef<Row, unknown>[] = [
  { id: "code", accessorKey: "code", header: "Code" },
  { id: "name", accessorKey: "name", header: "Name" },
  {
    id: "active",
    accessorKey: "active",
    header: "Status",
    meta: {
      filterOptions: [
        { value: true, label: "Active" },
        { value: false, label: "Inactive" },
      ],
    },
  },
  { id: "cityId", accessorKey: "cityId", header: "City" },
  { id: "addedOn", accessorKey: "addedOn", header: "Created on" },
  // Displayed but not published by the server, so it must offer neither control.
  { id: "addedByName", accessorKey: "addedByName", header: "Created by" },
];

const rows: Row[] = [
  { id: "1", code: "ALPHA", name: "Alpha", active: true, cityId: "c1", addedOn: "2026-01-01" },
];

const renderTable = (props: Partial<React.ComponentProps<typeof DataTable<Row>>> = {}) => {
  const fetchData = vi.fn().mockResolvedValue({ rows, pageCount: 3, totalCount: 25 });
  const result = renderWithProviders(
    <DataTable<Row>
      columns={columns}
      fetchData={fetchData}
      listFields={listFields}
      tableId="lf"
      showRowSelectionColumn={false}
      {...props}
    />,
  );
  return { fetchData, ...result };
};

const filterRow = () => {
  // The filter row is the second row in the header; the first holds the labels.
  const headerRows = screen.getAllByRole("row");
  return headerRows[1]!;
};

describe("column filters derived from LIST_FIELDS", () => {
  it("gives every published text column a search box, with no per-column declaration", async () => {
    // The regression this replaces: a filter appeared ONLY where a screen hand-declared
    // `meta.filterVariant`, and no column anywhere in the app declared `"text"` — so no
    // master could be filtered by its own code or name at all.
    renderTable();
    await waitFor(() => expect(screen.getByText("Alpha")).toBeInTheDocument());

    expect(within(filterRow()).getByPlaceholderText("Search Code")).toBeInTheDocument();
    expect(within(filterRow()).getByPlaceholderText("Search Name")).toBeInTheDocument();
  });

  it("offers NO filter for a uuid FK - a contains against a uuid matches nothing", async () => {
    renderTable();
    await waitFor(() => expect(screen.getByText("Alpha")).toBeInTheDocument());

    expect(within(filterRow()).queryByPlaceholderText("Search City")).not.toBeInTheDocument();
  });

  it("offers no filter for a column the server does not publish", async () => {
    renderTable();
    await waitFor(() => expect(screen.getByText("Alpha")).toBeInTheDocument());

    expect(within(filterRow()).queryByPlaceholderText("Search Created by")).not.toBeInTheDocument();
  });

  it("turns a boolean with options into a select, and a date into a range picker", async () => {
    renderTable();
    await waitFor(() => expect(screen.getByText("Alpha")).toBeInTheDocument());

    expect(within(filterRow()).getByRole("combobox", { name: "Status" })).toBeInTheDocument();
    expect(
      within(filterRow()).getByRole("button", { name: /pick a date range/i }),
    ).toBeInTheDocument();
  });

  it("renders no filter row at all when nothing is filterable", async () => {
    // `TableHead` is h-10, so an unconditional filter row cost every such table a 40px band.
    const fetchData = vi.fn().mockResolvedValue({ rows, pageCount: 1, totalCount: 1 });
    renderWithProviders(
      <DataTable<Row>
        columns={[{ id: "cityId", accessorKey: "cityId", header: "City" }]}
        fetchData={fetchData}
        listFields={{ cityId: "id" }}
        tableId="lf-none"
        showRowSelectionColumn={false}
      />,
    );
    await waitFor(() => expect(fetchData).toHaveBeenCalled());

    // Header rows: just the one.
    expect(screen.getAllByRole("row").filter((row) => row.closest("thead"))).toHaveLength(1);
  });

  it("sends the column filter with the operator its variant implies", async () => {
    const { fetchData } = renderTable();
    await waitFor(() => expect(screen.getByText("Alpha")).toBeInTheDocument());

    await userEvent.type(within(filterRow()).getByPlaceholderText("Search Code"), "AL");

    await waitFor(
      () =>
        expect(fetchData).toHaveBeenCalledWith(
          expect.objectContaining({
            filters: [expect.objectContaining({ field: "code", value: "AL", variant: "text" })],
          }),
        ),
      { timeout: 2000 },
    );
  });
});

describe("a column whose filter field differs from its own id", () => {
  /*
   * The Employee master's Roles column is `roleIds` (the Field Config id, shared with the
   * form) and filters on `roleId`. The filter payload is keyed by the COLUMN id, so looking
   * the column back up by its FILTER field found nothing — and the filter went out as
   * `{ field: "roleIds", operator: contains }`, which the server silently drops, so picking
   * a role changed nothing on screen.
   */
  it("sends the filterField, with the variant the column declares", async () => {
    const fetchData = vi.fn().mockResolvedValue({ rows, pageCount: 1, totalCount: 1 });
    renderWithProviders(
      <DataTable<Row>
        columns={[
          { id: "code", accessorKey: "code", header: "Code" },
          {
            id: "roleIds",
            header: "Roles",
            accessorFn: () => null,
            meta: {
              filterField: "roleId",
              filterVariant: "select",
              filterOptions: [{ value: "role-1", label: "Supervisor" }],
            },
          },
        ]}
        fetchData={fetchData}
        listFields={{ code: "text", roleId: "id" }}
        tableId="lf-alias"
        showRowSelectionColumn={false}
      />,
    );
    await waitFor(() => expect(screen.getByText("ALPHA")).toBeInTheDocument());

    await userEvent.click(within(filterRow()).getByRole("combobox", { name: "Roles" }));
    await userEvent.click(await screen.findByRole("option", { name: "Supervisor" }));

    await waitFor(() =>
      expect(fetchData).toHaveBeenLastCalledWith(
        expect.objectContaining({
          filters: [
            expect.objectContaining({ field: "roleId", value: "role-1", variant: "select" }),
          ],
        }),
      ),
    );
  });
});

describe("sorting", () => {
  it("cycles ascending → descending → unsorted, and hands the sort to fetchData", async () => {
    const { fetchData } = renderTable();
    await waitFor(() => expect(screen.getByText("Alpha")).toBeInTheDocument());

    const header = screen.getByRole("button", { name: /^Code/ });

    await userEvent.click(header);
    await waitFor(() =>
      expect(fetchData).toHaveBeenCalledWith(
        expect.objectContaining({ sort: "code", sortDir: "asc" }),
      ),
    );

    await userEvent.click(header);
    await waitFor(() =>
      expect(fetchData).toHaveBeenCalledWith(
        expect.objectContaining({ sort: "code", sortDir: "desc" }),
      ),
    );

    // Unsorted is a real third state: it hands the ordering back to the screen's own default,
    // which a two-state toggle could never restore.
    await userEvent.click(header);
    await waitFor(() =>
      expect(fetchData).toHaveBeenCalledWith(
        expect.objectContaining({ sort: undefined, sortDir: undefined }),
      ),
    );
  });

  it("reports the sort direction through aria-sort on the header cell", async () => {
    renderTable();
    await waitFor(() => expect(screen.getByText("Alpha")).toBeInTheDocument());

    const cell = screen.getByRole("columnheader", { name: /Code/ });
    expect(cell).toHaveAttribute("aria-sort", "none");

    await userEvent.click(screen.getByRole("button", { name: /^Code/ }));
    expect(screen.getByRole("columnheader", { name: /Code/ })).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
  });

  it("does not offer a sort on a uuid column, or on one the server cannot order by", async () => {
    renderTable();
    await waitFor(() => expect(screen.getByText("Alpha")).toBeInTheDocument());

    expect(screen.queryByRole("button", { name: /^City/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Created by/ })).not.toBeInTheDocument();
    // …and reports nothing rather than announcing them as sortable-but-unsorted.
    expect(screen.getByRole("columnheader", { name: /City/ })).not.toHaveAttribute("aria-sort");
  });

  it("respects an explicit enableSorting: false from the screen", async () => {
    const fetchData = vi.fn().mockResolvedValue({ rows, pageCount: 1, totalCount: 1 });
    renderWithProviders(
      <DataTable<Row>
        columns={[{ id: "code", accessorKey: "code", header: "Code", enableSorting: false }]}
        fetchData={fetchData}
        listFields={listFields}
        tableId="lf-nosort"
        showRowSelectionColumn={false}
      />,
    );
    await waitFor(() => expect(fetchData).toHaveBeenCalled());

    expect(screen.queryByRole("button", { name: /^Code/ })).not.toBeInTheDocument();
  });
});

describe("the toolbar search box", () => {
  it("reaches fetchData as `search`", async () => {
    const { fetchData } = renderTable();
    await waitFor(() => expect(screen.getByText("Alpha")).toBeInTheDocument());

    await userEvent.type(screen.getByRole("searchbox", { name: /search/i }), "alph");

    await waitFor(
      () => expect(fetchData).toHaveBeenCalledWith(expect.objectContaining({ search: "alph" })),
      { timeout: 2000 },
    );
  });

  it("is absent when searchable is false", async () => {
    renderTable({ searchable: false });
    await waitFor(() => expect(screen.getByText("Alpha")).toBeInTheDocument());

    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });
});

describe("narrowing the result set returns to page 0", () => {
  /**
   * TanStack's own `_autoResetPageIndex` is gated on `!manualPagination`, so in server mode it
   * never fires. Filtering while on page 3 requested page 3 OF THE FILTERED SET and rendered an
   * empty table — which reads as "no matches" rather than "wrong page".
   */
  const goToPageTwo = async (fetchData: ReturnType<typeof vi.fn>) => {
    await waitFor(() => expect(screen.getByText("Alpha")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: /next page/i }));
    await waitFor(() =>
      expect(fetchData).toHaveBeenCalledWith(expect.objectContaining({ pageIndex: 1 })),
    );
  };

  it("resets when a column filter changes", async () => {
    const { fetchData } = renderTable();
    await goToPageTwo(fetchData);

    await userEvent.type(within(filterRow()).getByPlaceholderText("Search Code"), "AL");

    await waitFor(
      () =>
        expect(fetchData).toHaveBeenCalledWith(
          expect.objectContaining({
            pageIndex: 0,
            filters: [expect.objectContaining({ value: "AL" })],
          }),
        ),
      { timeout: 2000 },
    );
  });

  it("resets when the search changes", async () => {
    const { fetchData } = renderTable();
    await goToPageTwo(fetchData);

    await userEvent.type(screen.getByRole("searchbox", { name: /search/i }), "x");

    await waitFor(
      () =>
        expect(fetchData).toHaveBeenCalledWith(
          expect.objectContaining({ pageIndex: 0, search: "x" }),
        ),
      { timeout: 2000 },
    );
  });

  it("resets when the sort changes", async () => {
    const { fetchData } = renderTable();
    await goToPageTwo(fetchData);

    await userEvent.click(screen.getByRole("button", { name: /^Code/ }));

    await waitFor(() =>
      expect(fetchData).toHaveBeenCalledWith(
        expect.objectContaining({ pageIndex: 0, sort: "code" }),
      ),
    );
  });
});

describe("Clear filters", () => {
  it("clears column filters and the search together, and flushes the debounced boxes", async () => {
    // v4 splits this and gets it wrong in both directions — its toolbar button appears only
    // when COLUMN filters exist yet wipes panel filters too.
    const { fetchData } = renderTable();
    await waitFor(() => expect(screen.getByText("Alpha")).toBeInTheDocument());

    await userEvent.type(screen.getByRole("searchbox", { name: /search/i }), "x");
    await userEvent.type(within(filterRow()).getByPlaceholderText("Search Code"), "AL");
    await waitFor(
      () => expect(screen.getByRole("button", { name: /clear filters/i })).toBeInTheDocument(),
      {
        timeout: 2000,
      },
    );

    await userEvent.click(screen.getByRole("button", { name: /clear filters/i }));

    await waitFor(
      () =>
        expect(fetchData).toHaveBeenCalledWith(
          expect.objectContaining({ search: undefined, filters: [] }),
        ),
      { timeout: 2000 },
    );
    expect(screen.queryByRole("button", { name: /clear filters/i })).not.toBeInTheDocument();
  });

  it("is absent while nothing is filtered", async () => {
    renderTable();
    await waitFor(() => expect(screen.getByText("Alpha")).toBeInTheDocument());

    expect(screen.queryByRole("button", { name: /clear filters/i })).not.toBeInTheDocument();
  });
});

describe("pagination stays reachable", () => {
  it("still renders its controls when a filter leaves zero rows", async () => {
    // It used to unmount at zero rows, so there was no way to page back out of a page that no
    // longer exists — and the row disappearing shifted everything below it.
    const fetchData = vi.fn().mockResolvedValue({ rows: [], pageCount: 0, totalCount: 0 });
    renderWithProviders(
      <DataTable<Row>
        columns={columns}
        fetchData={fetchData}
        listFields={listFields}
        tableId="lf-empty"
        showRowSelectionColumn={false}
      />,
    );

    expect(await screen.findByRole("button", { name: /previous page/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /first page/i })).toBeInTheDocument();
  });
});

describe("renderBulkActions", () => {
  /**
   * The export lives in the TOOLBAR rather than the page header for one reason: only the
   * table knows the live search, sort and column filters. A control mounted beside the page
   * title could not see them, so "Download All" would silently export the whole table while
   * the user was looking at three filtered rows — and a spreadsheet looks authoritative, so
   * there is nothing to tell them.
   */
  const renderWithBulkActions = () => {
    const received: FetchOptions[] = [];
    renderTable({
      renderBulkActions: (options) => {
        received.push(options);
        return <button type="button">Export</button>;
      },
    });
    const latest = () => received[received.length - 1]!;
    return { latest };
  };

  it("hands the live column filter to the export", async () => {
    const { latest } = renderWithBulkActions();
    await waitFor(() => expect(screen.getByText("Alpha")).toBeInTheDocument());

    expect(latest().filters ?? []).toEqual([]);

    await userEvent.type(within(filterRow()).getByPlaceholderText("Search Code"), "AL");

    await waitFor(() =>
      expect(latest().filters).toEqual([
        expect.objectContaining({ field: "code", value: "AL" }),
      ]),
    );
  });

  it("hands over the live sort too", async () => {
    const { latest } = renderWithBulkActions();
    await waitFor(() => expect(screen.getByText("Alpha")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: /^code$/i }));

    await waitFor(() => expect(latest()).toMatchObject({ sort: "code", sortDir: "asc" }));
  });
});

describe("an empty range is not a filter", () => {
  /**
   * Found in a browser, and invisible to every existing test.
   *
   * A `numberRange` column's two inputs each called `column.setFilterValue([...])`
   * unconditionally, so a blank Min/Max registered a `columnFilters` ENTRY holding
   * `["", ""]`. The list stayed correct — `toFilter` turns that into no query param — but
   * `activeFilterCount` counts entries, so a freshly loaded Transport Assets table (which has
   * exactly two `number` fields: `yearOfManufacture` and `seatingCapacity`) announced
   * "Clear filters 2" with nothing filtered.
   *
   * The button was also inert: `clearFilters` empties the state and bumps `resetKey`, both
   * inputs flush and re-register the same empty entry, and the count could never reach 0.
   */
  const numberListFields: ListFieldMap = { code: "text", seatingCapacity: "number" };
  const numberColumns: ColumnDef<Row, unknown>[] = [
    { id: "code", accessorKey: "code", header: "Code" },
    { id: "seatingCapacity", accessorKey: "seatingCapacity", header: "Seating capacity" },
  ];

  const renderNumberTable = () => {
    const fetchData = vi.fn().mockResolvedValue({ rows, pageCount: 1, totalCount: 1 });
    renderWithProviders(
      <DataTable<Row>
        columns={numberColumns}
        fetchData={fetchData}
        listFields={numberListFields}
        tableId="lf-range"
        showRowSelectionColumn={false}
      />,
    );
    return { fetchData };
  };

  it("offers no Clear filters control until something is actually filtered", async () => {
    renderNumberTable();
    await waitFor(() => expect(screen.getByText("ALPHA")).toBeInTheDocument());

    expect(screen.queryByRole("button", { name: /clear filters/i })).not.toBeInTheDocument();
  });

  it("clears back to nothing after a range is typed and removed", async () => {
    renderNumberTable();
    await waitFor(() => expect(screen.getByText("ALPHA")).toBeInTheDocument());

    const min = screen.getByLabelText(/seating capacity min/i);
    await userEvent.type(min, "40");
    // The control appears only once there is something to clear.
    const clear = await screen.findByRole("button", { name: /clear filters/i });

    await userEvent.click(clear);

    // And it must go away again. It used to survive its own click: the reset flushed both
    // inputs, which re-registered an empty entry each.
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /clear filters/i })).not.toBeInTheDocument(),
    );
  });

  it("still sends the range once one bound is given", async () => {
    const { fetchData } = renderNumberTable();
    await waitFor(() => expect(screen.getByText("ALPHA")).toBeInTheDocument());

    await userEvent.type(screen.getByLabelText(/seating capacity min/i), "40");

    await waitFor(() =>
      expect(fetchData).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.arrayContaining([
            expect.objectContaining({ field: "seatingCapacity", value: ["40", ""] }),
          ]),
        }),
      ),
    );
  });
});

describe("the empty and error bodies follow the horizontal scrollport", () => {
  /**
   * Found in a browser and UNMEASURABLE here, which is why this pins the class.
   *
   * The empty/error cell spans every column, so on a wide table it is far wider than the
   * scrollport — Transport Assets measured 3719px against a 922px view — and both bodies
   * centre inside it. At `scrollLeft: 0` "No results." sat at x≈2105 with the viewport
   * ending at 1244, so the user saw a blank box and had to scroll sideways to find out the
   * table was empty. The error body was worse: its Retry button went off-screen with it.
   *
   * jsdom performs no layout (`getBoundingClientRect` is all zeros), so no assertion here
   * can catch a regression by measuring. A sticky wrapper sized to the SCROLLPORT (`100cqw`
   * of the bordered container) is the mechanism: it stays on screen AND centres the body in
   * the visible area. A full-width child's containing block is the cell itself, so it would
   * have nothing to slide against. Same reasoning as `app-dialog.test.tsx` pinning its padding.
   */
  const wrapperOf = (node: HTMLElement) => node.closest("td")?.firstElementChild;
  const STICKY = ["sticky", "left-2", "w-[calc(100cqw-1rem)]"];

  it("wraps the empty body in a sticky, scrollport-width element", async () => {
    const fetchData = vi.fn().mockResolvedValue({ rows: [], pageCount: 0, totalCount: 0 });
    renderWithProviders(
      <DataTable<Row>
        columns={columns}
        fetchData={fetchData}
        listFields={listFields}
        tableId="lf-sticky-empty"
        showRowSelectionColumn={false}
      />,
    );

    const message = await screen.findByText(/no results/i);
    const wrapper = wrapperOf(message);
    expect(wrapper).toHaveClass(...STICKY);
  });

  it("does the same for the error body, so Retry stays reachable", async () => {
    const fetchData = vi.fn().mockRejectedValue(new Error("boom"));
    renderWithProviders(
      <DataTable<Row>
        columns={columns}
        fetchData={fetchData}
        listFields={listFields}
        tableId="lf-sticky-error"
        showRowSelectionColumn={false}
      />,
    );

    const alert = await screen.findByRole("alert");
    expect(wrapperOf(alert)).toHaveClass(...STICKY);
  });
});
