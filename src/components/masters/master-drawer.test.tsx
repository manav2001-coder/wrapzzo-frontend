import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithProviders, screen, waitFor } from "@/test/test-utils";
import { FormGenerator, type FormGeneratorHandle } from "@/components/fields/form-generator";
import { TextField } from "@/components/fields/text-field";
import { MasterDrawer } from "./master-drawer";

function handle(over: Partial<FormGeneratorHandle> = {}): FormGeneratorHandle {
  return { submit: vi.fn(), reset: vi.fn(), isSubmitting: false, ...over } as FormGeneratorHandle;
}

describe("MasterDrawer", () => {
  it("renders nothing while closed", () => {
    renderWithProviders(
      <MasterDrawer open={false} onOpenChange={vi.fn()} title="Edit franchise" handle={handle()}>
        <p>form body</p>
      </MasterDrawer>,
    );
    expect(screen.queryByText("form body")).not.toBeInTheDocument();
  });

  it("shows the title, description and body when open", () => {
    renderWithProviders(
      <MasterDrawer
        open
        onOpenChange={vi.fn()}
        title="Edit franchise"
        description="Pune Branch"
        handle={handle()}
      >
        <p>form body</p>
      </MasterDrawer>,
    );
    expect(screen.getByText("Edit franchise")).toBeInTheDocument();
    expect(screen.getByText("Pune Branch")).toBeInTheDocument();
    expect(screen.getByText("form body")).toBeInTheDocument();
  });

  /**
   * The footer owns the submit, not the form: `FormGenerator` is rendered with
   * `hideSubmitButton`, so Save has to reach it through the imperative handle. That keeps
   * Save pinned while the form body scrolls — it must stay reachable on a long form.
   */
  it("submits the form through the imperative handle", async () => {
    const h = handle();
    renderWithProviders(
      <MasterDrawer open onOpenChange={vi.fn()} title="Edit" handle={h}>
        <p>body</p>
      </MasterDrawer>,
    );
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(h.submit).toHaveBeenCalledTimes(1);
  });

  it("closes on cancel without submitting", async () => {
    const onOpenChange = vi.fn();
    const h = handle();
    renderWithProviders(
      <MasterDrawer open onOpenChange={onOpenChange} title="Edit" handle={h}>
        <p>body</p>
      </MasterDrawer>,
    );
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(h.submit).not.toHaveBeenCalled();
  });

  it("disables Save while the form is submitting, so it cannot be double-fired", () => {
    renderWithProviders(
      <MasterDrawer
        open
        onOpenChange={vi.fn()}
        title="Edit"
        handle={handle({ isSubmitting: true })}
      >
        <p>body</p>
      </MasterDrawer>,
    );
    expect(screen.getByRole("button", { name: /save/i })).toBeDisabled();
  });

  describe("while a save is in flight", () => {
    it("cannot be dismissed - Cancel disabled, X hidden, Escape ignored", async () => {
      const onOpenChange = vi.fn();
      renderWithProviders(
        <MasterDrawer
          open
          onOpenChange={onOpenChange}
          title="Edit"
          handle={handle({ isSubmitting: true })}
        >
          <p>body</p>
        </MasterDrawer>,
      );
      expect(screen.getByRole("button", { name: /cancel/i })).toBeDisabled();
      expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
      await userEvent.keyboard("{Escape}");
      expect(onOpenChange).not.toHaveBeenCalled();
    });

    /**
     * `handle.isSubmitting` only turns true after the form re-renders and re-runs `onReady`. The
     * handle here never reports it at all, so only the drawer's own record of the click it
     * handled can hold the Escape off.
     */
    it("holds dismissal from the click itself, before the form reports isSubmitting", async () => {
      let finish!: () => void;
      const h = handle({ submit: vi.fn(() => new Promise<void>((resolve) => (finish = resolve))) });
      const onOpenChange = vi.fn();
      renderWithProviders(
        <MasterDrawer open onOpenChange={onOpenChange} title="Edit" handle={h}>
          <p>body</p>
        </MasterDrawer>,
      );
      await userEvent.click(screen.getByRole("button", { name: /save/i }));
      await userEvent.keyboard("{Escape}");
      expect(onOpenChange).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: /save/i })).toBeDisabled();

      finish();
      await waitFor(() => expect(screen.getByRole("button", { name: /cancel/i })).toBeEnabled());
      await userEvent.keyboard("{Escape}");
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("ignores a click on the overlay, which closes the drawer otherwise", async () => {
      const onOpenChange = vi.fn();
      const { rerender } = renderWithProviders(
        <MasterDrawer
          open
          onOpenChange={onOpenChange}
          title="Edit"
          handle={handle({ isSubmitting: true })}
        >
          <p>body</p>
        </MasterDrawer>,
      );
      // Radix registers its outside-pointer listener a tick after opening.
      await new Promise((resolve) => setTimeout(resolve, 0));
      fireEvent.pointerDown(document.body);
      expect(onOpenChange).not.toHaveBeenCalled();

      rerender(
        <MasterDrawer open onOpenChange={onOpenChange} title="Edit" handle={handle()}>
          <p>body</p>
        </MasterDrawer>,
      );
      // Same tick as above: under React 19 Radix re-registers its listener after the rerender too.
      fireEvent.pointerUp(document.body);
      fireEvent.click(document.body);
      await new Promise((resolve) => setTimeout(resolve, 0));
      fireEvent.pointerDown(document.body);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("holds Continue too, so the step cannot change under a save", () => {
      renderWithProviders(
        <MasterDrawer
          open
          onOpenChange={vi.fn()}
          title="Edit"
          handle={handle({
            isSubmitting: true,
            step: {
              index: 0,
              count: 3,
              next: vi.fn(),
              back: vi.fn(),
              goTo: vi.fn(),
            },
          })}
        >
          <p>body</p>
        </MasterDrawer>,
      );
      expect(screen.getByRole("button", { name: /^continue$/i })).toBeDisabled();
    });

    it("is closable again after a save that throws before it returns a promise", async () => {
      const onOpenChange = vi.fn();
      const onSubmit = vi.fn((): void => {
        throw new Error("boom");
      });
      renderWithProviders(
        <MasterDrawer
          open
          onOpenChange={onOpenChange}
          title="Edit"
          handle={null}
          onSubmit={onSubmit}
        >
          <p>body</p>
        </MasterDrawer>,
      );
      await userEvent.click(screen.getByRole("button", { name: /save/i }));
      expect(onSubmit).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(screen.getByRole("button", { name: /cancel/i })).toBeEnabled());
      await userEvent.keyboard("{Escape}");
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("settles a rejected save without an unhandled rejection", async () => {
      const unhandled = vi.fn();
      process.on("unhandledRejection", unhandled);
      try {
        renderWithProviders(
          <MasterDrawer
            open
            onOpenChange={vi.fn()}
            title="Edit"
            handle={null}
            onSubmit={() => Promise.reject(new Error("refused"))}
          >
            <p>body</p>
          </MasterDrawer>,
        );
        await userEvent.click(screen.getByRole("button", { name: /save/i }));
        await waitFor(() => expect(screen.getByRole("button", { name: /save/i })).toBeEnabled());
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(unhandled).not.toHaveBeenCalled();
      } finally {
        process.off("unhandledRejection", unhandled);
      }
    });

    /**
     * The drawer reads the PARENT's stored handle, and a form unmounted mid-submit never reports
     * the submit settling — without a settled handle on the way out, `isSubmitting` would stay
     * true and the drawer could never be closed.
     */
    it("is closable again when the form is swapped out mid-submit", async () => {
      let finish!: () => void;
      const onOpenChange = vi.fn();
      function Harness() {
        const [h, setH] = React.useState<FormGeneratorHandle | null>(null);
        const [showForm, setShowForm] = React.useState(true);
        return (
          <MasterDrawer open onOpenChange={onOpenChange} title="Edit" handle={h}>
            <p>{h?.isSubmitting ? "submitting" : "idle"}</p>
            <button type="button" onClick={() => setShowForm(false)}>
              Swap
            </button>
            {showForm && (
              <FormGenerator
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
                maxWidgetsPerRow={1}
                hideCardWrapper
                hideSubmitButton
                onSubmit={() => new Promise<void>((resolve) => (finish = resolve))}
                onReady={setH}
              />
            )}
          </MasterDrawer>
        );
      }
      renderWithProviders(<Harness />);
      await userEvent.click(await screen.findByRole("button", { name: /save/i }));
      await screen.findByText("submitting");
      await userEvent.click(screen.getByRole("button", { name: "Swap" }));
      finish();

      await waitFor(() => expect(screen.getByRole("button", { name: /cancel/i })).toBeEnabled());
      expect(screen.getByText("idle")).toBeInTheDocument();
      await userEvent.keyboard("{Escape}");
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe("with no form behind it", () => {
    it("runs `onSubmit` from the default Save", async () => {
      const onSubmit = vi.fn();
      renderWithProviders(
        <MasterDrawer open onOpenChange={vi.fn()} title="Edit" handle={null} onSubmit={onSubmit}>
          <p>body</p>
        </MasterDrawer>,
      );
      await userEvent.click(screen.getByRole("button", { name: /save/i }));
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it("holds Save disabled while `submitDisabled`", () => {
      renderWithProviders(
        <MasterDrawer
          open
          onOpenChange={vi.fn()}
          title="Edit"
          handle={null}
          onSubmit={vi.fn()}
          submitDisabled
        >
          <p>body</p>
        </MasterDrawer>,
      );
      expect(screen.getByRole("button", { name: /save/i })).toBeDisabled();
    });

    it("shows `error` as an alert outside the button row", () => {
      renderWithProviders(
        <MasterDrawer
          open
          onOpenChange={vi.fn()}
          title="Edit"
          handle={null}
          onSubmit={vi.fn()}
          error={"Step 1 has no instruction.\nStep 2 has no instruction."}
        >
          <p>body</p>
        </MasterDrawer>,
      );
      const alert = screen.getByRole("alert");
      expect(alert).toHaveTextContent("Step 1 has no instruction.");
      expect(alert).not.toContainElement(screen.getByRole("button", { name: /save/i }));
    });
  });

  it("disables Save until the form has registered its handle", () => {
    renderWithProviders(
      <MasterDrawer open onOpenChange={vi.fn()} title="Edit" handle={null}>
        <p>body</p>
      </MasterDrawer>,
    );
    expect(screen.getByRole("button", { name: /save/i })).toBeDisabled();
  });

  it("hides the whole footer in read-only mode", () => {
    renderWithProviders(
      <MasterDrawer open readOnly onOpenChange={vi.fn()} title="View" handle={handle()}>
        <p>body</p>
      </MasterDrawer>,
    );
    expect(screen.queryByRole("button", { name: /save/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /cancel/i })).not.toBeInTheDocument();
  });

  it("replaces the default Cancel/Save footer entirely when given one - for a step with no form to submit", () => {
    renderWithProviders(
      <MasterDrawer
        open
        onOpenChange={vi.fn()}
        title="Add route"
        handle={null}
        footer={<button type="button">Done</button>}
      >
        <p>body</p>
      </MasterDrawer>,
    );
    expect(screen.getByRole("button", { name: "Done" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^save$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /cancel/i })).not.toBeInTheDocument();
  });

  describe("with a stepper form", () => {
    const at = (index: number) =>
      handle({
        step: { index, count: 3, next: vi.fn(), back: vi.fn(), goTo: vi.fn() },
      });
    const drawer = (h: FormGeneratorHandle) =>
      renderWithProviders(
        <MasterDrawer open onOpenChange={vi.fn()} title="Add" handle={h}>
          <p>body</p>
        </MasterDrawer>,
      );

    it("offers Continue and Save, but no Back, on the first step", () => {
      drawer(at(0));
      expect(screen.getByRole("button", { name: /^continue$/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^save$/i })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^back$/i })).not.toBeInTheDocument();
    });

    it("offers Back and Continue in the middle, and drives the handle with them", async () => {
      const h = at(1);
      drawer(h);
      await userEvent.click(screen.getByRole("button", { name: /^continue$/i }));
      await userEvent.click(screen.getByRole("button", { name: /^back$/i }));
      expect(h.step!.next).toHaveBeenCalledTimes(1);
      expect(h.step!.back).toHaveBeenCalledTimes(1);
      expect(h.submit).not.toHaveBeenCalled();
    });

    it("offers Save, and no Continue, on the last step", async () => {
      const h = at(2);
      drawer(h);
      expect(screen.queryByRole("button", { name: /^continue$/i })).not.toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: /^save$/i }));
      expect(h.submit).toHaveBeenCalledTimes(1);
    });
  });

  it("uses a caller-supplied submit label", () => {
    renderWithProviders(
      <MasterDrawer
        open
        onOpenChange={vi.fn()}
        title="Create"
        submitLabel="Create franchise"
        handle={handle()}
      >
        <p>body</p>
      </MasterDrawer>,
    );
    expect(screen.getByRole("button", { name: "Create franchise" })).toBeInTheDocument();
  });
});
