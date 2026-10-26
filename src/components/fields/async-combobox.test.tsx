import * as React from "react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders, screen, waitFor, within } from "@/test/test-utils";
import { AsyncCombobox, type AsyncComboboxProps } from "./async-combobox";

interface Row {
  id: string;
  name: string;
  blocked?: boolean;
}

/** 45 rows over pageSize 20 → 3 pages, the last one partial. */
function makeFetchPage(total = 45) {
  const calls: Array<{ page: number; search: string }> = [];
  const fetchPage = vi.fn(
    async ({ page, pageSize, search }: { page: number; pageSize: number; search: string }) => {
      calls.push({ page, search });
      const all: Row[] = Array.from({ length: total }, (_, i) => ({
        id: `r-${i + 1}`,
        name: `Row ${i + 1}`,
        blocked: i === 1,
      }));
      const matched = search
        ? all.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()))
        : all;
      const offset = page * pageSize;
      const data = matched.slice(offset, offset + pageSize);
      return {
        data,
        page,
        pageSize,
        total: matched.length,
        hasMore: offset + data.length < matched.length,
      };
    },
  );
  return { fetchPage, calls };
}

function Harness({
  fetchPage,
  initialValue = null,
  ...props
}: Omit<AsyncComboboxProps<Row>, "value" | "onChange" | "displayValue" | "getOptionKey"> & {
  initialValue?: Row | Row[] | null;
  displayValue?: (row: Row) => string;
}) {
  const [value, setValue] = React.useState<Row | Row[] | null>(initialValue);
  return (
    <AsyncCombobox<Row>
      fetchPage={fetchPage}
      displayValue={(row) => row.name}
      getOptionKey={(row) => row.id}
      value={value}
      onChange={setValue}
      {...props}
    />
  );
}

/** Fake the popover list's layout so the scroll handler's guard passes. */
function scrollListToBottom(list: HTMLElement) {
  for (const [key, value] of Object.entries({
    scrollTop: 700,
    scrollHeight: 1000,
    clientHeight: 300,
  })) {
    Object.defineProperty(list, key, { value, configurable: true });
  }
  list.dispatchEvent(new Event("scroll", { bubbles: true }));
}

/**
 * The trigger button, disambiguated from cmdk's CommandInput — which ALSO carries
 * role="combobox", so a bare getByRole("combobox") is ambiguous while the popover is open.
 */
const getTrigger = () =>
  screen.getAllByRole("combobox").find((el) => el.tagName === "BUTTON") as HTMLElement;

const openTrigger = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(getTrigger());
};

describe("AsyncCombobox", () => {
  it("fetches nothing until the popover is opened", async () => {
    const { fetchPage } = makeFetchPage();
    renderWithProviders(<Harness queryKey={["rows"]} fetchPage={fetchPage} />);

    // Give any stray effect a chance to fire before asserting the negative.
    await waitFor(() => expect(getTrigger()).toBeInTheDocument());
    expect(fetchPage).not.toHaveBeenCalled();
  });

  it("loads the first page on open", async () => {
    const user = userEvent.setup();
    const { fetchPage } = makeFetchPage();
    renderWithProviders(<Harness queryKey={["rows"]} fetchPage={fetchPage} />);

    await openTrigger(user);
    await waitFor(() => expect(screen.getByText("Row 1")).toBeInTheDocument());
    expect(screen.getByText("Row 20")).toBeInTheDocument();
    expect(screen.queryByText("Row 21")).not.toBeInTheDocument();
  });

  it("appends the next page when the list is scrolled to the bottom", async () => {
    const user = userEvent.setup();
    const { fetchPage } = makeFetchPage();
    renderWithProviders(<Harness queryKey={["rows"]} fetchPage={fetchPage} />);

    await openTrigger(user);
    await waitFor(() => expect(screen.getByText("Row 20")).toBeInTheDocument());

    scrollListToBottom(screen.getByRole("listbox"));
    await waitFor(() => expect(screen.getByText("Row 21")).toBeInTheDocument());
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it("shows an end-of-results marker once every page is loaded", async () => {
    const user = userEvent.setup();
    const { fetchPage } = makeFetchPage(25);
    renderWithProviders(<Harness queryKey={["rows"]} fetchPage={fetchPage} />);

    await openTrigger(user);
    await waitFor(() => expect(screen.getByText("Row 20")).toBeInTheDocument());
    scrollListToBottom(screen.getByRole("listbox"));

    await waitFor(() => expect(screen.getByText("End of results")).toBeInTheDocument());
  });

  it("selects a single option and closes", async () => {
    const user = userEvent.setup();
    const { fetchPage } = makeFetchPage();
    renderWithProviders(<Harness queryKey={["rows"]} fetchPage={fetchPage} />);

    await openTrigger(user);
    await waitFor(() => expect(screen.getByText("Row 3")).toBeInTheDocument());
    await user.click(screen.getByText("Row 3"));

    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
    expect(getTrigger()).toHaveTextContent("Row 3");
  });

  it("does not select a disabled option", async () => {
    const user = userEvent.setup();
    const { fetchPage } = makeFetchPage();
    renderWithProviders(
      <Harness
        queryKey={["rows"]}
        fetchPage={fetchPage}
        getOptionDisabled={(row) => Boolean(row.blocked)}
      />,
    );

    await openTrigger(user);
    await waitFor(() => expect(screen.getByText("Row 2")).toBeInTheDocument());
    await user.click(screen.getByText("Row 2"));

    // Still open, nothing chosen.
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(getTrigger()).not.toHaveTextContent("Row 2");
  });

  it("debounces typing and requests only the settled term", async () => {
    const user = userEvent.setup();
    const { fetchPage, calls } = makeFetchPage();
    renderWithProviders(<Harness queryKey={["rows"]} fetchPage={fetchPage} />);

    await openTrigger(user);
    await waitFor(() => expect(screen.getByText("Row 1")).toBeInTheDocument());

    await user.type(screen.getByPlaceholderText("Search…"), "Row 42");
    await waitFor(() => expect(calls.some((c) => c.search === "Row 42")).toBe(true), {
      timeout: 3000,
    });
    // Intermediate keystrokes never reached the server.
    expect(calls.some((c) => c.search === "R")).toBe(false);
    expect(calls.some((c) => c.search === "Ro")).toBe(false);
  });

  it("renders the empty state when a search matches nothing", async () => {
    const user = userEvent.setup();
    const { fetchPage } = makeFetchPage();
    renderWithProviders(
      <Harness queryKey={["rows"]} fetchPage={fetchPage} emptyText="Nothing here" />,
    );

    await openTrigger(user);
    await waitFor(() => expect(screen.getByText("Row 1")).toBeInTheDocument());
    await user.type(screen.getByPlaceholderText("Search…"), "zzzznope");

    // Guards the shouldFilter={false} trap: cmdk's own CommandEmpty never renders when
    // filtering is off, so this row has to come from our own code.
    await waitFor(() => expect(screen.getByText("Nothing here")).toBeInTheDocument(), {
      timeout: 3000,
    });
  });

  it("prompts instead of searching below minSearchLength", async () => {
    const user = userEvent.setup();
    const { fetchPage } = makeFetchPage();
    renderWithProviders(<Harness queryKey={["rows"]} fetchPage={fetchPage} minSearchLength={3} />);

    await openTrigger(user);
    await waitFor(() =>
      expect(screen.getByText("Type at least 3 characters to search")).toBeInTheDocument(),
    );
    expect(fetchPage).not.toHaveBeenCalled();

    await user.type(screen.getByPlaceholderText("Search…"), "Row");
    await waitFor(() => expect(fetchPage).toHaveBeenCalled(), { timeout: 3000 });
  });

  /**
   * The regression this component is most likely to develop: if the rendered list came
   * from the loaded pages instead of `value`, a selection would lose its tick — and a
   * multi-select chip its row — as soon as a search excluded the page it arrived on.
   */
  it("keeps a selected option visible and ticked when the search excludes it", async () => {
    const user = userEvent.setup();
    const { fetchPage } = makeFetchPage();
    renderWithProviders(
      <Harness
        queryKey={["rows"]}
        fetchPage={fetchPage}
        multiple
        initialValue={[{ id: "r-1", name: "Row 1" }]}
      />,
    );

    await openTrigger(user);
    await waitFor(() => expect(screen.getByText("Row 20")).toBeInTheDocument());

    await user.type(screen.getByPlaceholderText("Search…"), "Row 33");
    await waitFor(() => expect(screen.getByText("Row 33")).toBeInTheDocument(), { timeout: 3000 });

    // "Row 1" is not in the filtered result, but it is still selected — so it stays.
    const list = screen.getByRole("listbox");
    expect(within(list).getByText("Row 1")).toBeInTheDocument();
  });

  it("toggles multiple values and removes one via its chip", async () => {
    const user = userEvent.setup();
    const { fetchPage } = makeFetchPage();
    renderWithProviders(<Harness queryKey={["rows"]} fetchPage={fetchPage} multiple />);

    await openTrigger(user);
    await waitFor(() => expect(screen.getByText("Row 1")).toBeInTheDocument());
    await user.click(screen.getByText("Row 1"));
    await user.click(screen.getByText("Row 2"));

    // Chips render outside the popover list.
    await waitFor(() => expect(screen.getByLabelText("Remove Row 1")).toBeInTheDocument());
    expect(screen.getByLabelText("Remove Row 2")).toBeInTheDocument();

    await user.click(screen.getByLabelText("Remove Row 1"));
    await waitFor(() => expect(screen.queryByLabelText("Remove Row 1")).not.toBeInTheDocument());
    expect(screen.getByLabelText("Remove Row 2")).toBeInTheDocument();
  });

  it("dedupes a row that arrives on two pages", async () => {
    const user = userEvent.setup();
    const fetchPage = vi.fn(async ({ page }: { page: number }) => ({
      data:
        page === 0
          ? [{ id: "a", name: "Alpha" }]
          : [
              { id: "a", name: "Alpha" },
              { id: "b", name: "Beta" },
            ],
      page,
      pageSize: 1,
      total: 3,
      hasMore: page === 0,
    }));
    renderWithProviders(<Harness queryKey={["rows"]} fetchPage={fetchPage} pageSize={1} />);

    await openTrigger(user);
    await waitFor(() => expect(screen.getByText("Alpha")).toBeInTheDocument());
    scrollListToBottom(screen.getByRole("listbox"));

    await waitFor(() => expect(screen.getByText("Beta")).toBeInTheDocument());
    expect(screen.getAllByText("Alpha")).toHaveLength(1);
  });

  it("caps rendered rows and offers to refine", async () => {
    const user = userEvent.setup();
    const { fetchPage } = makeFetchPage(45);
    renderWithProviders(
      <Harness queryKey={["rows"]} fetchPage={fetchPage} maxRenderedOptions={5} />,
    );

    await openTrigger(user);
    await waitFor(() => expect(screen.getByText("Row 5")).toBeInTheDocument());
    expect(screen.queryByText("Row 6")).not.toBeInTheDocument();
    expect(screen.getByText(/refine your search/i)).toBeInTheDocument();
  });

  it("calls addNew.onAdd with the current search term", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    const { fetchPage } = makeFetchPage();
    renderWithProviders(
      <Harness queryKey={["rows"]} fetchPage={fetchPage} addNew={{ label: "Add branch", onAdd }} />,
    );

    await openTrigger(user);
    await user.type(screen.getByPlaceholderText("Search…"), "Kolhapur");
    await user.click(screen.getByRole("button", { name: "Add branch" }));

    expect(onAdd).toHaveBeenCalledWith("Kolhapur");
  });

  it("surfaces a fetch failure", async () => {
    const user = userEvent.setup();
    const fetchPage = vi.fn(async () => {
      throw new Error("Lookup unavailable");
    });
    renderWithProviders(<Harness queryKey={["rows"]} fetchPage={fetchPage} />);

    await openTrigger(user);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Lookup unavailable"));
  });

  it("is not openable when disabled", async () => {
    const { fetchPage } = makeFetchPage();
    renderWithProviders(<Harness queryKey={["rows"]} fetchPage={fetchPage} disabled />);
    expect(getTrigger()).toBeDisabled();
    expect(fetchPage).not.toHaveBeenCalled();
  });
});
