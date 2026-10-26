import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithProviders } from "@/test/test-utils";
import { Combobox } from "./combobox";

interface Branch {
  id: string;
  name: string;
}

const BRANCHES: Branch[] = [
  { id: "pune", name: "Pune" },
  { id: "nagpur", name: "Nagpur" },
];

describe("Combobox", () => {
  it("selecting an option from `options` calls onChange with that option", async () => {
    const onChange = vi.fn();
    renderWithProviders(
      <Combobox options={BRANCHES} displayValue={(d) => d.name} value={null} onChange={onChange} />,
    );

    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(await screen.findByText("Nagpur"));

    expect(onChange).toHaveBeenCalledWith(BRANCHES[1]);
  });

  it("multiple + disabled: shows the chips but offers no way to remove one", async () => {
    // A read-only view (the Employee master's View drawer) renders its pickers disabled, and
    // the chip's × used to still clear the value.
    renderWithProviders(
      <Combobox
        options={BRANCHES}
        displayValue={(d) => d.name}
        multiple
        disabled
        value={[BRANCHES[0]!]}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Pune")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /remove pune/i })).not.toBeInTheDocument();
  });

  it("multiple: renders removable chips and removing one updates the array", async () => {
    const onChange = vi.fn();
    renderWithProviders(
      <Combobox
        options={BRANCHES}
        displayValue={(d) => d.name}
        multiple
        value={[BRANCHES[0]!, BRANCHES[1]!]}
        onChange={onChange}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /remove pune/i }));
    expect(onChange).toHaveBeenCalledWith([BRANCHES[1]]);
  });

  it("onSearch mode debounces and calls the async fn, showing results", async () => {
    const onSearch = vi.fn().mockResolvedValue(BRANCHES);
    renderWithProviders(
      <Combobox
        onSearch={onSearch}
        displayValue={(d: Branch) => d.name}
        value={null}
        onChange={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole("combobox"));
    await waitFor(() => expect(onSearch).toHaveBeenCalled());
    expect(await screen.findByText("Pune")).toBeInTheDocument();
  });
});

/**
 * The search box must match what the user can SEE.
 *
 * cmdk filters on `CommandItem`'s `value`, and this component sets that to
 * `getOptionKey(option)` — deliberately, because two options may share a label and the
 * value is what identifies the selection. The consequence nobody noticed: with keys that
 * are uuids or code constants (`selectField` passes `option.value`, so `OWN_DEPOT_PUMP`
 * or a tank's id), typing the label a user is reading filters EVERYTHING out and the
 * picker reads as empty.
 *
 * `keywords` is the fix rather than moving the label into `value`: it adds matchable text
 * while leaving identity alone. Found by an e2e spec typing "T1" into a tank picker and
 * getting no options — the search box had never worked for any local combobox.
 */
describe("searching by what is on screen", () => {
  const KEYED = [
    { id: "3f2a9c0e-0000-4000-8000-000000000001", label: "Own depot pump" },
    { id: "3f2a9c0e-0000-4000-8000-000000000002", label: "Third-party outlet" },
  ];

  function renderKeyed() {
    renderWithProviders(
      <Combobox
        options={KEYED}
        value={null}
        onChange={() => {}}
        displayValue={(option) => option.label}
        getOptionKey={(option) => option.id}
      />,
    );
  }

  it("finds an option by its LABEL, not only by its key", async () => {
    const user = userEvent.setup();
    renderKeyed();
    await user.click(screen.getByRole("combobox"));
    await user.type(screen.getByPlaceholderText("Search…"), "depot");

    expect(screen.getByRole("option", { name: /own depot pump/i })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /third-party outlet/i })).not.toBeInTheDocument();
  });

  it("still narrows to nothing for a term that matches no label", async () => {
    const user = userEvent.setup();
    renderKeyed();
    await user.click(screen.getByRole("combobox"));
    await user.type(screen.getByPlaceholderText("Search…"), "zzzz");

    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });
});
