import { describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { z } from "zod";

import { renderWithProviders } from "@/test/test-utils";
import { FormGenerator, type FieldConfig } from "@/components/fields/form-generator";
import { AsyncCombobox } from "@/components/fields/async-combobox";
import { Combobox } from "@/components/fields/combobox";
import { DatePicker } from "@/components/fields/date-picker";
import { DateTimePicker } from "@/components/fields/date-time-picker";
import { DateRangePicker } from "@/components/fields/date-range-picker";
import { NumberInput } from "@/components/fields/number-input";
import { RadioGroupField } from "@/components/fields/radio-group-field";
import { SwitchField } from "@/components/fields/switch-field";
import { TextField } from "@/components/fields/text-field";
import { ToggleGroupField } from "@/components/fields/toggle-group-field";

const OPTIONS = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Bravo" },
];

/** One page, no network. Nothing is fetched until the popover opens anyway. */
const fetchPage = vi.fn(async () => ({
  data: [{ id: "a", label: "Alpha" }],
  page: 0,
  pageSize: 20,
  total: 1,
  hasMore: false,
}));

const renderForm = (fields: FieldConfig[]) =>
  renderWithProviders(
    <FormGenerator maxWidgetsPerRow={1} onSubmit={vi.fn()} fields={fields} hideCardWrapper />,
  );

/**
 * `FormControl` clones its child with `id`, `aria-describedby` and `aria-invalid`, and
 * `FormLabel` sets `htmlFor` to that same id. A field that does not FORWARD them onto its
 * focusable element drops all three on a wrapper `<div>`, which is not a labelable element —
 * so clicking the label focuses nothing and the field has no accessible name from its label.
 *
 * Only `phone-field.tsx` used to get this right, and it is the only one that documented the
 * trap. `getByLabelText` is the assertion because it fails for exactly the broken case.
 */
describe("every field is reachable by its own label", () => {
  const CASES: [string, FieldConfig["render"]][] = [
    [
      "TextField",
      ({ value, onChange }) => (
        <TextField value={value as string} onChange={(e) => onChange(e.target.value)} />
      ),
    ],
    [
      "Combobox",
      ({ value, onChange }) => (
        <Combobox
          options={OPTIONS}
          displayValue={(option) => option.label}
          value={(value as (typeof OPTIONS)[number]) ?? null}
          onChange={onChange}
        />
      ),
    ],
    [
      "DatePicker",
      ({ value, onChange }) => <DatePicker value={value as Date} onChange={onChange} />,
    ],
    [
      "DateTimePicker",
      ({ value, onChange }) => <DateTimePicker value={value as Date} onChange={onChange} />,
    ],
    [
      "DateRangePicker",
      ({ onChange }) => <DateRangePicker value={undefined} onChange={onChange} />,
    ],
    [
      "NumberInput",
      ({ value, onChange }) => (
        <NumberInput value={value as number} onChange={(next) => onChange(next)} />
      ),
    ],
    [
      "SwitchField",
      ({ value, onChange }) => <SwitchField checked={Boolean(value)} onCheckedChange={onChange} />,
    ],
    [
      "AsyncCombobox",
      ({ value, onChange }) => (
        <AsyncCombobox
          queryKey={["a11y"]}
          fetchPage={fetchPage}
          getOptionKey={(option) => option.id}
          displayValue={(option) => option.label}
          value={(value as { id: string; label: string }) ?? null}
          onChange={onChange}
        />
      ),
    ],
  ];

  for (const [name, render] of CASES) {
    it(`${name} receives the id FormControl injects`, () => {
      renderForm([{ id: "field", label: `${name} label`, render }]);
      expect(screen.getByLabelText(`${name} label`)).toBeInTheDocument();
    });
  }

  it("ToggleGroupField still receives the id, though a radiogroup cannot be labelled by htmlFor", () => {
    // Radix renders `<div role="group">`, which is not a labelable element — so `FormLabel`'s
    // `htmlFor` can never name it and `getByLabelText` correctly refuses. Forwarding the id is
    // still what makes `aria-describedby` and `aria-invalid` land on the group rather than on a
    // wrapper. Naming a GROUP is `aria-labelledby`'s job, which `FormControl` does not inject.
    renderForm([
      {
        id: "field",
        label: "Toggle label",
        render: ({ value, onChange }) => (
          <ToggleGroupField
            exclusive
            value={(value as string) ?? ""}
            onValueChange={onChange}
            options={OPTIONS}
          />
        ),
      },
    ]);

    // `exclusive` renders Radix's single-select group, which is `role="radiogroup"`.
    const group = screen.getByRole("radiogroup");
    expect(group).toHaveAttribute("id");
    expect(group).toHaveAttribute("aria-invalid", "false");
  });
});

describe("an invalid control is visibly invalid, not just its label", () => {
  it("marks the input aria-invalid, which is what the primitive styles", async () => {
    // `ui/input.tsx` styles `aria-[invalid=true]:border-destructive`. Before that rule the
    // label and the message went red around a completely neutral box — and `TextField`'s own
    // `error` prop could not help, because `FormGenerator` hands `error` as a STRING while the
    // prop is a boolean, so no screen ever forwarded it.
    renderForm([
      {
        id: "field",
        label: "Name",
        zodSchema: z.string().min(3, "Too short"),
        initialValue: "",
        render: ({ value, onChange }) => (
          <TextField value={value as string} onChange={(e) => onChange(e.target.value)} />
        ),
      },
    ]);

    const input = screen.getByLabelText("Name");
    expect(input).toHaveAttribute("aria-invalid", "false");

    await userEvent.type(input, "ab");
    await userEvent.click(screen.getByRole("button", { name: /submit/i }));

    expect(await screen.findByText("Too short")).toBeInTheDocument();

    const invalid = screen.getByLabelText("Name");
    expect(invalid).toHaveAttribute("aria-invalid", "true");
    // The attribute was ALWAYS injected — what was missing is the rule that reacts to it, so
    // that is what this asserts. Note the arbitrary variant: Tailwind 3's default `aria`
    // variants do not include `invalid`, so a plain `aria-invalid:` prefix compiles to
    // nothing and the box stays neutral while the class name looks right in the DOM.
    expect(invalid).toHaveClass("aria-[invalid=true]:border-destructive");
  });

  it("reserves the message line so an error does not shift the fields below it", () => {
    // React Hook Form revalidates per keystroke, so a message that unmounts when valid grew
    // and shrank its grid row while the user was still typing.
    renderForm([
      {
        id: "field",
        label: "Name",
        render: ({ value, onChange }) => (
          <TextField value={value as string} onChange={(e) => onChange(e.target.value)} />
        ),
      },
    ]);

    // The slot is present and empty while the field is valid, so nothing moves when a
    // message appears in it.
    const reserved = document.querySelector("p.min-h-4");
    expect(reserved).toBeInTheDocument();
    expect(reserved).toBeEmptyDOMElement();
  });
});

describe("RadioGroupField ids do not collide", () => {
  it("two groups without a `name` keep their own label associations", async () => {
    // Ids were `` `${name ?? "radio"}-${value}` ``, and `name` is optional and usually omitted —
    // so two groups on a page produced IDENTICAL ids. A `<label for>` binds to the first match
    // in the document, so clicking the second group's option toggled the first group's.
    const first = vi.fn();
    const second = vi.fn();
    renderWithProviders(
      <>
        <RadioGroupField value="" onValueChange={first} options={OPTIONS} label="First" />
        <RadioGroupField value="" onValueChange={second} options={OPTIONS} label="Second" />
      </>,
    );

    const groups = screen.getAllByRole("radiogroup");
    expect(groups).toHaveLength(2);

    // Click the SECOND group's "Alpha" label.
    await userEvent.click(within(groups[1]!.parentElement!).getAllByText("Alpha")[0]!);

    expect(second).toHaveBeenCalledWith("a");
    expect(first).not.toHaveBeenCalled();
  });
});

describe("TextField multiline keeps its adornments", () => {
  it("shows the loading spinner instead of a silently disabled textarea", () => {
    // `trailing` and `startAdornment` were computed and then never rendered in the multiline
    // branch, so `loading` disabled the box and showed nothing at all.
    renderWithProviders(<TextField multiline loading value="" onChange={vi.fn()} />);

    const textarea = screen.getByRole("textbox");
    expect(textarea).toBeDisabled();
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders an endAdornment rather than dropping it", () => {
    renderWithProviders(
      <TextField multiline value="" onChange={vi.fn()} endAdornment={<span>kg</span>} />,
    );
    expect(screen.getByText("kg")).toBeInTheDocument();
  });
});

describe("NumberInput's step buttons are translated", () => {
  it("names them from the locale catalog, not hardcoded English", () => {
    renderWithProviders(<NumberInput value={1} onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Increment" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Decrement" })).toBeInTheDocument();
  });
});

describe("a control with no label at all is named by aria-label", () => {
  /*
   * A picker rendered inside a `FormGenerator` `render` field with no label element (a per-row
   * picker in a line grid) has `aria-label` as its only accessible name; without it the trigger
   * is announced as an unnamed combobox. Asserted on the trigger's accessible name, not on props.
   */
  it("AsyncCombobox names its trigger from aria-label", () => {
    renderForm([
      {
        id: "giftId",
        label: "",
        render: ({ value, onChange }) => (
          <AsyncCombobox
            queryKey={["a11y-label"]}
            fetchPage={fetchPage}
            getOptionKey={(option) => option.id}
            displayValue={(option) => option.label}
            aria-label="Gift for recipient 1"
            value={(value as { id: string; label: string }) ?? null}
            onChange={onChange}
          />
        ),
      },
    ]);
    expect(screen.getByRole("combobox", { name: "Gift for recipient 1" })).toBeInTheDocument();
  });
});
