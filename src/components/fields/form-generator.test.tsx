import * as React from "react";
import * as ReactDOM from "react-dom";
import { describe, expect, it, vi } from "vitest";
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { z } from "zod";

import { renderWithProviders } from "@/test/test-utils";

import {
  FormGenerator,
  type FieldConfig,
  type FormGeneratorHandle,
  type StepConfig,
} from "./form-generator";
import { SwitchField } from "./switch-field";
import { TextField } from "./text-field";

describe("FormGenerator", () => {
  /**
   * The anchor the validation summary's "Show me" targets. The control's own id comes from
   * `React.useId()` and its label is translated, so neither survives a reload or a language
   * switch — the config id on the wrapper does.
   */
  it("puts each field's registry id on its wrapper as data-field-id", () => {
    const fields: FieldConfig[] = [
      {
        id: "branchName",
        label: "Branch name",
        render: ({ value, onChange }) => (
          <TextField value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
        ),
      },
    ];
    renderWithProviders(<FormGenerator fields={fields} maxWidgetsPerRow={1} onSubmit={vi.fn()} />);
    const input = screen.getByRole("textbox");
    expect(input.closest("[data-field-id]")?.getAttribute("data-field-id")).toBe("branchName");
    expect(document.querySelectorAll('[data-field-id="branchName"] input')).toHaveLength(1);
  });

  /*
   * A picker's in-place Add drawer is a second form PORTALED out of one of this form's fields.
   * React bubbles its submit along the component tree, so without the guard pressing Enter in
   * the drawer also submitted the half-filled form underneath.
   */
  it("does not submit when a form portaled inside one of its fields is submitted", async () => {
    const outerSubmit = vi.fn();
    const innerSubmit = vi.fn();
    const text = (id: string, label: string): FieldConfig => ({
      id,
      label,
      render: ({ value, onChange }) => (
        <TextField
          aria-label={label}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      ),
    });
    const fields: FieldConfig[] = [
      {
        id: "driverId",
        label: "Driver",
        render: () => (
          <>
            {ReactDOM.createPortal(
              <FormGenerator
                fields={[text("name", "New driver name")]}
                maxWidgetsPerRow={1}
                onSubmit={innerSubmit}
              />,
              document.body,
            )}
          </>
        ),
      },
    ];
    renderWithProviders(
      <FormGenerator fields={fields} maxWidgetsPerRow={1} onSubmit={outerSubmit} />,
    );

    await userEvent.type(screen.getByLabelText("New driver name"), "Ramesh{Enter}");

    await waitFor(() => expect(innerSubmit).toHaveBeenCalledWith({ name: "Ramesh" }));
    expect(outerSubmit).not.toHaveBeenCalled();
  });

  /* The asterisk alone marks a mandatory field; optional ones carry no tag of their own. */
  it("marks only required fields, with an asterisk and no Optional tag", () => {
    const text = (id: string, label: string, required?: boolean): FieldConfig => ({
      id,
      label,
      required,
      render: ({ value, onChange }) => (
        <TextField value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
      ),
    });
    renderWithProviders(
      <FormGenerator
        fields={[text("name", "Name", true), text("remarks", "Remarks")]}
        maxWidgetsPerRow={1}
        mode="create"
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByText("Name").textContent).toBe("Name *");
    expect(screen.getByText("Remarks").textContent).toBe("Remarks");
    expect(screen.queryByText(/optional/i)).not.toBeInTheDocument();
  });

  it("flat mode: renders fields and submits assembled values", async () => {
    const onSubmit = vi.fn();
    const fields: FieldConfig[] = [
      {
        id: "name",
        label: "Name",
        required: true,
        zodSchema: z.string().min(1, "Name is required"),
        render: ({ value, onChange }) => (
          <TextField value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
        ),
      },
    ];

    renderWithProviders(<FormGenerator fields={fields} maxWidgetsPerRow={1} onSubmit={onSubmit} />);

    await userEvent.type(screen.getByRole("textbox"), "Ada");
    await userEvent.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ name: "Ada" }));
  });

  it("runs onSubmit once when a second submit arrives while the first is still in flight", async () => {
    let finish!: () => void;
    const onSubmit = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    const handleRef: { current: FormGeneratorHandle | null } = { current: null };
    const fields: FieldConfig[] = [
      {
        id: "name",
        label: "Name",
        render: ({ value, onChange }) => (
          <TextField value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
        ),
      },
    ];
    renderWithProviders(
      <FormGenerator
        fields={fields}
        maxWidgetsPerRow={1}
        onSubmit={onSubmit}
        onReady={(handle) => (handleRef.current = handle)}
      />,
    );
    await waitFor(() => expect(handleRef.current).not.toBeNull());

    // The footer's stale handle and a second click both reach the same submit.
    const submit = handleRef.current!.submit;
    submit();
    submit();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    finish();
    await waitFor(() => expect(handleRef.current!.isSubmitting).toBe(false));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("blocks submit and shows a message when a required field is invalid", async () => {
    const onSubmit = vi.fn();
    const fields: FieldConfig[] = [
      {
        id: "name",
        label: "Name",
        zodSchema: z.string().min(1, "Name is required"),
        render: ({ value, onChange }) => (
          <TextField value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
        ),
      },
    ];

    renderWithProviders(<FormGenerator fields={fields} maxWidgetsPerRow={1} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole("button", { name: /submit/i }));

    expect(await screen.findByText("Name is required")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("stepper mode: gates Continue until the current step's fields validate, then advances", async () => {
    const steps: StepConfig[] = [
      {
        label: "Details",
        fields: [
          {
            id: "name",
            label: "Name",
            zodSchema: z.string().min(1, "Required"),
            render: ({ value, onChange }) => (
              <TextField
                value={(value as string) ?? ""}
                onChange={(e) => onChange(e.target.value)}
              />
            ),
          },
        ],
      },
      {
        label: "Review",
        fields: [
          {
            id: "confirm",
            label: "Confirm",
            fieldKind: "boolean",
            zodSchema: z.boolean(),
            render: ({ value, onChange }) => (
              <SwitchField checked={Boolean(value)} onCheckedChange={onChange} />
            ),
          },
        ],
      },
    ];

    renderWithProviders(<FormGenerator steps={steps} maxWidgetsPerRow={1} onSubmit={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();

    await userEvent.type(screen.getByRole("textbox"), "Ada");
    await userEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(await screen.findByRole("switch")).toBeInTheDocument();
  });

  describe("sections and an outside driver", () => {
    const nameField = (id: string, label: string): FieldConfig => ({
      id,
      label,
      zodSchema: z.string().min(1, `${label} is required`),
      render: ({ value, onChange }) => (
        <TextField
          aria-label={label}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      ),
    });
    const steps: StepConfig[] = [
      { label: "Personal", fields: [nameField("first", "First")] },
      { label: "Bank", fields: [nameField("bank", "Bank name")] },
    ];

    it("stepMode=sections heads each step with its label and jumps by its circles", async () => {
      renderWithProviders(
        <FormGenerator steps={steps} stepMode="sections" maxWidgetsPerRow={1} onSubmit={vi.fn()} />,
      );

      expect(screen.getByRole("heading", { name: "Personal" })).toBeInTheDocument();
      expect(screen.getByText("Step 1 of 2")).toBeInTheDocument();
      // A jump is not a Continue: it does not wait for this section to validate.
      await userEvent.click(screen.getByRole("button", { name: "Bank" }));
      expect(screen.getByRole("heading", { name: "Bank" })).toBeInTheDocument();
      expect(screen.getByLabelText("Bank name")).toBeInTheDocument();
    });

    it("hands the parent the step, and an invalid submit opens the step that failed", async () => {
      let handle: FormGeneratorHandle | null = null;
      const onSubmit = vi.fn();
      renderWithProviders(
        <FormGenerator
          steps={steps}
          maxWidgetsPerRow={1}
          hideSubmitButton
          onSubmit={onSubmit}
          onReady={(next) => {
            handle = next;
          }}
        />,
      );

      expect(handle!.step).toMatchObject({ index: 0, count: 2 });
      await userEvent.type(screen.getByLabelText("First"), "Ada");
      handle!.step!.next();
      expect(await screen.findByLabelText("Bank name")).toBeInTheDocument();
      await waitFor(() => expect(handle!.step!.index).toBe(1));

      handle!.step!.back();
      expect(await screen.findByLabelText("First")).toBeInTheDocument();
      await userEvent.clear(screen.getByLabelText("First"));
      handle!.step!.goTo(1);
      expect(await screen.findByLabelText("Bank name")).toBeInTheDocument();
      await userEvent.type(screen.getByLabelText("Bank name"), "HDFC");

      // The blank is on step 1, not the one on screen — the submit goes back to it.
      handle!.submit();
      expect(await screen.findByText("First is required")).toBeInTheDocument();
      expect(screen.getByLabelText("First")).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe("stepper mode in a drawer (the handle drives it)", () => {
    const requiredText = (id: string, label: string): FieldConfig => ({
      id,
      label,
      zodSchema: z.string().min(1, `${label} is required`),
      render: ({ value, onChange }) => (
        <TextField
          aria-label={label}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      ),
    });
    const three: StepConfig[] = [
      { label: "One", fields: [requiredText("a", "Alpha")] },
      { label: "Two", fields: [requiredText("b", "Beta")] },
      { label: "Three", fields: [requiredText("c", "Gamma")] },
    ];

    function mount(mode: "create" | "edit", values?: Record<string, unknown>) {
      let latest: FormGeneratorHandle | null = null;
      const onSubmit = vi.fn();
      renderWithProviders(
        <FormGenerator
          steps={three}
          mode={mode}
          values={values}
          maxWidgetsPerRow={1}
          hideSubmitButton
          onSubmit={onSubmit}
          onReady={(h) => {
            latest = h;
          }}
        />,
      );
      return { handle: () => latest!, onSubmit };
    }

    it("tells the parent which step it is on, and drives Continue and Back", async () => {
      const { handle } = mount("create");
      await waitFor(() => expect(handle().step).toMatchObject({ index: 0, count: 3 }));

      // Continue is gated by the step's own fields.
      await act(async () => handle().step!.next());
      expect(handle().step!.index).toBe(0);

      await userEvent.type(screen.getByLabelText("Alpha"), "x");
      await act(async () => handle().step!.next());
      await waitFor(() => expect(handle().step!.index).toBe(1));

      act(() => handle().step!.back());
      await waitFor(() => expect(handle().step!.index).toBe(0));
    });

    it("has no step info on a flat form", async () => {
      let latest: FormGeneratorHandle | null = null;
      renderWithProviders(
        <FormGenerator
          fields={[requiredText("a", "Alpha")]}
          maxWidgetsPerRow={1}
          hideSubmitButton
          onSubmit={vi.fn()}
          onReady={(h) => {
            latest = h;
          }}
        />,
      );
      await waitFor(() => expect(latest).not.toBeNull());
      expect(latest!.step).toBeUndefined();
    });

    it("jumps to the step that holds the error when a save is rejected from elsewhere", async () => {
      // Editing lets Save run from step one; the broken field is on step two. Without the jump
      // the form refuses to save and nothing on screen says why.
      const { handle, onSubmit } = mount("edit", { a: "1", b: "", c: "3" });
      await waitFor(() => expect(handle().step).toBeDefined());

      await act(() => handle().submit());

      expect(await screen.findByText("Beta is required")).toBeInTheDocument();
      expect(handle().step!.index).toBe(1);
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("lets a step circle go back, but forward only when editing", async () => {
      const created = mount("create");
      await userEvent.type(screen.getByLabelText("Alpha"), "x");
      await act(async () => created.handle().step!.next());
      await waitFor(() => expect(created.handle().step!.index).toBe(1));

      // Forward is refused while creating: step 3 has not been earned.
      await userEvent.click(screen.getByRole("button", { name: "Three" }));
      expect(created.handle().step!.index).toBe(1);
      // Back is free: step 1 is now a completed circle, with a tick and no number.
      await userEvent.click(screen.getAllByRole("button")[0]!);
      await waitFor(() => expect(created.handle().step!.index).toBe(0));
    });

    it("lets a step circle go straight to any step when editing", async () => {
      const { handle } = mount("edit", { a: "1", b: "2", c: "3" });
      await waitFor(() => expect(handle().step).toBeDefined());

      await userEvent.click(screen.getByRole("button", { name: "Three" }));
      await waitFor(() => expect(handle().step!.index).toBe(2));
    });
  });

  it("mode=view hides the submit button", () => {
    const fields: FieldConfig[] = [
      {
        id: "name",
        label: "Name",
        render: ({ value }) => <TextField value={(value as string) ?? ""} readOnly />,
      },
    ];
    renderWithProviders(
      <FormGenerator fields={fields} maxWidgetsPerRow={1} onSubmit={vi.fn()} mode="view" />,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("mode=filter renders 'Apply filters' as the submit label", () => {
    const fields: FieldConfig[] = [
      {
        id: "name",
        label: "Name",
        render: ({ value, onChange }) => (
          <TextField value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
        ),
      },
    ];
    renderWithProviders(
      <FormGenerator fields={fields} maxWidgetsPerRow={1} onSubmit={vi.fn()} mode="filter" />,
    );
    expect(screen.getByRole("button", { name: /apply filters/i })).toBeInTheDocument();
  });

  it("fieldKind:'custom' renders renderCustom without FormGenerator injecting props", () => {
    const fields: FieldConfig[] = [
      {
        id: "custom",
        fieldKind: "custom",
        renderCustom: () => <div data-testid="custom-field">custom control</div>,
      },
    ];
    renderWithProviders(<FormGenerator fields={fields} maxWidgetsPerRow={1} onSubmit={vi.fn()} />);
    expect(screen.getByTestId("custom-field")).toBeInTheDocument();
  });
});

// ─── The four capabilities the master drawers depend on ─────────────────────────

const textField = (id: string, label: string, extra: Partial<FieldConfig> = {}): FieldConfig => ({
  id,
  label,
  render: ({ value, onChange }) => (
    <TextField value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
  ),
  ...extra,
});

describe("FormGenerator - async values", () => {
  it("populates when `values` ARRIVES, not just at mount", async () => {
    // An edit drawer opens before its fetch resolves. `defaultValues` is read once, so
    // without the reset-on-change the form would stay blank forever.
    function Harness() {
      const [values, setValues] = React.useState<Record<string, unknown> | undefined>(undefined);
      return (
        <>
          <button type="button" onClick={() => setValues({ name: "Ada" })}>
            load
          </button>
          <FormGenerator
            fields={[textField("name", "Name")]}
            values={values}
            maxWidgetsPerRow={1}
            onSubmit={vi.fn()}
          />
        </>
      );
    }

    renderWithProviders(<Harness />);
    expect(screen.getByRole("textbox")).toHaveValue("");

    await userEvent.click(screen.getByRole("button", { name: "load" }));
    await waitFor(() => expect(screen.getByRole("textbox")).toHaveValue("Ada"));
  });

  it("treats an API null as empty instead of silently blocking submit", async () => {
    // An API row spells "no value" as null; a form field spells it as "". Passing the
    // null straight through fails a `.optional()` schema — null is neither a string nor
    // undefined — and the form then refuses to submit with NO visible error, because the
    // offending field is one the user never touched.
    const onSubmit = vi.fn();
    renderWithProviders(
      <FormGenerator
        fields={[
          textField("name", "Name"),
          textField("notes", "Notes", { zodSchema: z.string().optional() }),
        ]}
        values={{ name: "Ada", notes: null }}
        maxWidgetsPerRow={2}
        onSubmit={onSubmit}
      />,
    );

    const [, notes] = screen.getAllByRole("textbox");
    await waitFor(() => expect(notes).toHaveValue(""));

    await userEvent.click(screen.getByRole("button", { name: /submit/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ name: "Ada", notes: "" }));
  });

  it("fills absent keys from the defaults rather than leaving inputs uncontrolled", async () => {
    // A partial row (optional columns null) must not flip a controlled input to
    // uncontrolled — React warns and the field stops tracking its own state.
    renderWithProviders(
      <FormGenerator
        fields={[textField("name", "Name"), textField("notes", "Notes")]}
        values={{ name: "Ada" }}
        maxWidgetsPerRow={2}
        onSubmit={vi.fn()}
      />,
    );

    const [name, notes] = screen.getAllByRole("textbox");
    await waitFor(() => expect(name).toHaveValue("Ada"));
    expect(notes).toHaveValue("");
  });
});

describe("FormGenerator - conditional visibility", () => {
  it("shows and hides a field as the values it depends on change", async () => {
    const fields: FieldConfig[] = [
      textField("kind", "Kind"),
      textField("reason", "Reason", { hidden: (values) => values.kind !== "other" }),
    ];

    renderWithProviders(<FormGenerator fields={fields} maxWidgetsPerRow={1} onSubmit={vi.fn()} />);

    expect(screen.queryByText("Reason")).not.toBeInTheDocument();

    await userEvent.type(screen.getByRole("textbox"), "other");
    await waitFor(() => expect(screen.getByText("Reason")).toBeInTheDocument());
  });

  it("still submits a hidden field's value - hiding is not unregistering", async () => {
    const onSubmit = vi.fn();
    const fields: FieldConfig[] = [
      textField("visible", "Visible"),
      textField("secret", "Secret", { initialValue: "kept", hidden: () => true }),
    ];

    renderWithProviders(<FormGenerator fields={fields} maxWidgetsPerRow={1} onSubmit={onSubmit} />);

    await userEvent.type(screen.getByRole("textbox"), "x");
    await userEvent.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ visible: "x", secret: "kept" }));
  });
});

describe("FormGenerator - external submit", () => {
  it("submits from a button outside the form via the onReady handle", async () => {
    const onSubmit = vi.fn();

    function Harness() {
      const handleRef = React.useRef<FormGeneratorHandle | null>(null);
      return (
        <>
          <FormGenerator
            fields={[textField("name", "Name")]}
            maxWidgetsPerRow={1}
            hideSubmitButton
            onSubmit={onSubmit}
            onReady={(handle) => {
              handleRef.current = handle;
            }}
          />
          {/* This is the drawer-footer case: the button lives outside <form>. */}
          <button type="button" onClick={() => handleRef.current?.submit()}>
            save from footer
          </button>
        </>
      );
    }

    renderWithProviders(<Harness />);
    await userEvent.type(screen.getByRole("textbox"), "Ada");
    await userEvent.click(screen.getByRole("button", { name: "save from footer" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ name: "Ada" }));
  });
  it("reports every value change through `onChange`", async () => {
    // The Address master debounces a "does this already exist?" lookup off this. It reads
    // the SAME subscription `hidden` already uses rather than adding a second one.
    const onChange = vi.fn();
    renderWithProviders(
      <FormGenerator
        fields={[textField("name", "Name")]}
        maxWidgetsPerRow={1}
        onSubmit={vi.fn()}
        onChange={onChange}
      />,
    );

    await userEvent.type(screen.getByRole("textbox"), "Ada");
    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ name: "Ada" }));
  });

  it("does not re-fire `onChange` when nothing actually changed", async () => {
    // `form.watch()` returns a NEW object every render, so depending on it directly makes
    // any parent that setStates in response loop forever. The effect keys on the
    // serialized values for exactly that reason.
    const onChange = vi.fn();
    function Harness() {
      const [, force] = React.useState(0);
      return (
        <>
          <FormGenerator
            fields={[textField("name", "Name")]}
            maxWidgetsPerRow={1}
            onSubmit={vi.fn()}
            onChange={onChange}
          />
          <button type="button" onClick={() => force((n) => n + 1)}>
            re-render
          </button>
        </>
      );
    }

    renderWithProviders(<Harness />);
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));

    await userEvent.click(screen.getByRole("button", { name: "re-render" }));
    await userEvent.click(screen.getByRole("button", { name: "re-render" }));

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("writes a field from outside the form through `setValue`", async () => {
    // The cross-field case a field's own `onChange` cannot express: the Address master's
    // pincode lookup fills country/state/city in one go.
    const onSubmit = vi.fn();
    function Harness() {
      const handleRef = React.useRef<FormGeneratorHandle | null>(null);
      return (
        <>
          <FormGenerator
            fields={[textField("name", "Name"), textField("city", "City")]}
            maxWidgetsPerRow={1}
            hideSubmitButton
            onSubmit={onSubmit}
            onReady={(handle) => {
              handleRef.current = handle;
            }}
          />
          <button type="button" onClick={() => handleRef.current?.setValue("city", "Pune")}>
            autofill
          </button>
          <button type="button" onClick={() => handleRef.current?.submit()}>
            save
          </button>
        </>
      );
    }

    renderWithProviders(<Harness />);
    await userEvent.type(screen.getByRole("textbox", { name: /name/i }), "Ada");
    await userEvent.click(screen.getByRole("button", { name: "autofill" }));

    // Visible in the input, not just in the form state — the field is controlled, so a
    // write that skipped the input would be invisible to the user.
    await waitFor(() => expect(screen.getByRole("textbox", { name: /city/i })).toHaveValue("Pune"));

    await userEvent.click(screen.getByRole("button", { name: "save" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ name: "Ada", city: "Pune" }));
  });
});

describe("the handle reads the LIVE values", () => {
  it("answers what is typed now, not what the form held when the handle was made", async () => {
    // A preview of an unsaved edit depends on this: the handle is built once the form goes dirty,
    // and the very next keystroke must still be visible to a later `getValues()`.
    let handle: FormGeneratorHandle | null = null;
    renderWithProviders(
      <FormGenerator
        fields={[textField("name", "Name")]}
        maxWidgetsPerRow={1}
        hideSubmitButton
        onSubmit={vi.fn()}
        onReady={(next) => {
          handle = next;
        }}
      />,
    );

    await userEvent.type(screen.getByRole("textbox", { name: /name/i }), "A");
    await waitFor(() => expect(handle?.isDirty).toBe(true));
    const firstHandle = handle as FormGeneratorHandle | null;
    await userEvent.type(screen.getByRole("textbox", { name: /name/i }), "da");

    expect(firstHandle?.getValues()).toEqual({ name: "Ada" });
  });
});

describe("the handle submits through the LATEST onSubmit", () => {
  /*
   * `onReady` hands the parent a `submit()` from an effect keyed on `[isSubmitting, isDirty]`,
   * so the drawer footer holds whatever closure existed when those flags last changed. For
   * every master that is harmless: their submit handlers read only `values`, which react-hook-
   * form holds live.
   *
   * It stops being harmless the moment a screen's submit depends on state the FORM does not
   * own — the inventory line grids are the first, because a `render` field's rows live in the
   * page's own `useState`. There the footer sent the rows as they were on mount while the
   * totals strip, rebuilt every render, showed the current ones: a purchase order that
   * previewed ₹2832 and saved with no lines at all.
   */
  it("calls the handler from the current render, not the one captured at mount", async () => {
    const onSubmit = vi.fn();

    function Harness() {
      const [extra, setExtra] = React.useState("initial");
      const [handle, setHandle] = React.useState<FormGeneratorHandle | null>(null);

      return (
        <div>
          <button type="button" onClick={() => setExtra("updated")}>
            change external state
          </button>
          {/* The drawer footer's button, which drives the form through the handle. */}
          <button type="button" onClick={() => handle?.submit()}>
            footer submit
          </button>
          <FormGenerator
            maxWidgetsPerRow={1}
            fields={[
              {
                id: "name",
                label: "Name",
                render: ({ value, onChange }) => (
                  <TextField
                    value={(value as string) ?? ""}
                    onChange={(e) => onChange(e.target.value)}
                  />
                ),
              },
            ]}
            hideCardWrapper
            hideSubmitButton
            onReady={setHandle}
            // Closes over `extra` — exactly the shape of a page whose lines live outside RHF.
            onSubmit={(values) => onSubmit({ ...values, extra })}
          />
        </div>
      );
    }

    renderWithProviders(<Harness />);
    await userEvent.type(screen.getByRole("textbox"), "Anything");
    await userEvent.click(screen.getByRole("button", { name: /change external state/i }));
    await userEvent.click(screen.getByRole("button", { name: /footer submit/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({ extra: "updated" });
  });
});

describe("FormGenerator - steps and cross-step validation", () => {
  const text = (id: string, label: string, schema?: z.ZodTypeAny): FieldConfig => ({
    id,
    label,
    zodSchema: schema,
    render: ({ value, onChange, disabled }) => (
      <TextField
        aria-label={label}
        value={(value as string) ?? ""}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    ),
  });
  const steps: StepConfig[] = [
    { label: "Basics", fields: [text("notes", "Notes"), text("city", "City")] },
    {
      label: "More",
      fields: [text("state", "State", z.string().min(1, "Required")), text("contact", "Contact person")],
    },
  ];
  function renderForm(
    onSubmit: (values: Record<string, unknown>) => void | Promise<void> = vi.fn(),
  ) {
    renderWithProviders(
      <FormGenerator steps={steps} maxWidgetsPerRow={1} mode="create" onSubmit={onSubmit} />,
    );
    return onSubmit;
  }

  it("saving from step 1 names the mandatory field left empty on step 2 and takes the user there", async () => {
    const onSubmit = renderForm();
    await userEvent.click(screen.getByRole("button", { name: /submit/i }));

    const summary = await screen.findByTestId("form-validation-summary");
    expect(summary).toHaveTextContent("Can't save yet");
    expect(summary).toHaveTextContent("Step 2 · More");
    expect(summary).toHaveTextContent("1 mandatory field is empty: State");
    expect(onSubmit).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByLabelText("State")).toHaveFocus());

    await userEvent.type(screen.getByLabelText("State"), "MH");
    await waitFor(() =>
      expect(screen.queryByTestId("form-validation-summary")).not.toBeInTheDocument(),
    );
  });

  it("Continue stays on a step whose mandatory field is empty and names it", async () => {
    renderWithProviders(
      <FormGenerator
        steps={[steps[1]!, steps[0]!]}
        maxWidgetsPerRow={1}
        mode="create"
        onSubmit={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /continue/i }));

    expect(await screen.findByTestId("step-validation-note")).toHaveTextContent(
      "Fill in this mandatory field before you continue: State",
    );
    expect(screen.queryByLabelText("City")).not.toBeInTheDocument();
  });

  it("puts a server refusal of its own save under the named field's step", async () => {
    const { routeServerValidationErrors } = await import("@/lib/form-server-errors");
    renderForm(
      vi.fn(async () => {
        routeServerValidationErrors({ fieldErrors: { contact: ["Already in use"] } });
      }),
    );
    // The form's own rules pass first (State is mandatory), so the save reaches the server.
    await userEvent.click(screen.getByRole("button", { name: /submit/i }));
    await userEvent.type(await screen.findByLabelText("State"), "MH");
    await userEvent.click(screen.getByRole("button", { name: /submit/i }));

    const summary = await screen.findByTestId("form-validation-summary");
    expect(summary).toHaveTextContent("Step 2 · More");
    expect(summary).toHaveTextContent("Contact person");
  });

  it("Enter in a field of an earlier create step moves on, rather than saving the whole form", async () => {
    const onSubmit = renderForm();
    await userEvent.type(screen.getByLabelText("Notes"), "Hello{Enter}");

    expect(await screen.findByLabelText("State")).toBeInTheDocument();
    expect(screen.queryByTestId("form-validation-summary")).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("Enter on the last step still saves", async () => {
    const onSubmit = renderForm();
    await userEvent.click(screen.getByRole("button", { name: /continue/i }));
    await userEvent.type(await screen.findByLabelText("State"), "MH{Enter}");
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  });

  it("leaves a refusal of some other request alone — only its own save's errors land", async () => {
    const { routeServerValidationErrors } = await import("@/lib/form-server-errors");
    renderForm();
    let taken = true;
    act(() => {
      taken = routeServerValidationErrors({ fieldErrors: { contact: ["Already in use"] } });
    });
    expect(taken).toBe(false);
    expect(screen.queryByTestId("form-validation-summary")).not.toBeInTheDocument();
  });

  it("renders a flat field list as one page with no stepper", () => {
    renderWithProviders(
      <FormGenerator fields={steps[0]!.fields} maxWidgetsPerRow={1} onSubmit={vi.fn()} />,
    );
    expect(screen.getByLabelText("Notes")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /continue/i })).not.toBeInTheDocument();
  });
});
