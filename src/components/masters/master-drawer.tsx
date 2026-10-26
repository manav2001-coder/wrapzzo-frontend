import * as React from "react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { FormGeneratorHandle } from "@/components/fields/form-generator";

export interface MasterDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Hide the footer entirely, e.g. for a read-only view. */
  readOnly?: boolean;
  submitLabel?: string;
  /**
   * The form's handle, from `FormGenerator`'s `onReady`. The footer button drives it —
   * a Sheet footer sits outside the `<form>` element, so a plain `type="submit"` there
   * would do nothing.
   */
  handle: FormGeneratorHandle | null;
  /**
   * Replaces the default Cancel/Save footer entirely — same override `AppDialog` already
   * offers. For a multi-step drawer (`RoutesPage`'s create wizard) the LAST step has no form
   * to submit via `handle` at all (it manages a live child list, not a form), so the default
   * handle-driven Save button does not apply there.
   */
  footer?: React.ReactNode;
  /**
   * For a drawer with no `FormGenerator` behind it (a table of edits, a checklist): the default
   * Save runs this instead of `handle.submit()`. Return the promise — the drawer stays busy, and
   * undismissable, until it settles. Report your own errors: a throw or rejection only ends the
   * busy state here, it is not shown.
   */
  onSubmit?: () => void | Promise<void>;
  /** Holds Save disabled, e.g. nothing has changed yet. */
  submitDisabled?: boolean;
  /** Shown above the footer, in its own scrolling strip so a long list cannot crowd the buttons. */
  error?: React.ReactNode;
  /** Extra classes for the panel — e.g. a wider `sm:max-w-3xl` for a line-grid form. */
  className?: string;
  children: React.ReactNode;
}

/**
 * The side drawer every master create/edit form lives in.
 *
 * A drawer rather than a route or a modal dialog: the list keeps its scroll position,
 * page and filters while you edit, so adding five users in a row does not mean
 * re-filtering the table five times. v4 navigated to a full-page form and lost all of it.
 */
export function MasterDrawer({
  open,
  onOpenChange,
  title,
  description,
  readOnly,
  submitLabel,
  handle,
  footer,
  onSubmit,
  submitDisabled,
  error,
  className,
  children,
}: MasterDrawerProps) {
  const { t } = useTranslation();
  /*
   * A save the footer started, set in the click handler itself. `handle.isSubmitting` only turns
   * true after FormGenerator re-renders and re-runs `onReady`, so an Escape in the same frame as
   * the click would still close the drawer with the request in flight. The ref is what the
   * dismissal guard reads; the state re-renders the footer.
   */
  const pendingRef = React.useRef(false);
  const [pending, setPending] = React.useState(false);
  // `handle.isSubmitting` stays in: an Enter pressed in a field submits from inside the form and
  // never passes through the drawer's own Save.
  const isBusy = () => pendingRef.current || Boolean(handle?.isSubmitting);
  const busy = pending || Boolean(handle?.isSubmitting);

  /*
   * None of Escape, the overlay, the X or Cancel may close a drawer whose save is still running:
   * the save would then land on a form the user thought they had left. The same shape as
   * `AppDialog`'s `blocked` — the events are cancelled at the source, and `onOpenChange` is
   * guarded for anything that gets past them.
   */
  const requestOpenChange = (next: boolean) => {
    if (!next && isBusy()) return;
    onOpenChange(next);
  };
  const holdWhileBusy = (event: Event) => {
    if (isBusy()) event.preventDefault();
  };

  const submit = async () => {
    if (pendingRef.current || (!onSubmit && !handle)) return;
    pendingRef.current = true;
    setPending(true);
    try {
      // Awaited inside the `try`, so a handler that throws before returning a promise still
      // reaches the `finally` — otherwise the drawer would stay busy, and undismissable, for good.
      await (onSubmit ? onSubmit() : handle!.submit());
    } catch {
      // The caller has already reported its own failure (a toast, the `error` strip). Caught so a
      // rejected save is not also an unhandled rejection.
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  };

  // A stepper form (`FormGenerator steps={…}`) reports where it is; a flat one does not, and keeps
  // the plain Cancel / Save footer.
  const step = handle?.step && handle.step.count > 1 ? handle.step : null;
  const onLastStep = !step || step.index === step.count - 1;

  return (
    <Sheet open={open} onOpenChange={requestOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={!busy}
        onEscapeKeyDown={holdWhileBusy}
        onPointerDownOutside={holdWhileBusy}
        onInteractOutside={holdWhileBusy}
        // Wide enough for a two-column field grid on a laptop, full-width on a phone.
        className={cn("flex w-full flex-col gap-0 p-0 sm:max-w-xl", className)}
      >
        <SheetHeader className="border-b px-6 py-4 text-left">
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>

        {/* The form scrolls; the header and footer stay put, so Save is always reachable
            on a long form like the User master. */}
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {!readOnly && error && (
          <div
            role="alert"
            className="max-h-32 overflow-y-auto whitespace-pre-line border-t px-6 py-3 text-sm text-destructive"
          >
            {error}
          </div>
        )}

        {!readOnly && (
          <SheetFooter className="flex-row justify-end gap-2 border-t px-6 py-4">
            {footer ?? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  data-guide-id="drawer.cancel"
                  disabled={busy}
                  onClick={() => requestOpenChange(false)}
                >
                  {t("action.cancel")}
                </Button>
                {step && step.index > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    data-guide-id="drawer.back"
                    onClick={() => handle?.step?.back()}
                    disabled={busy}
                  >
                    {t("action.back")}
                  </Button>
                )}
                {!onLastStep && (
                  <Button
                    type="button"
                    // Outlined: Save sits beside it on every step (a save from any step validates
                    // the whole form), so Save stays the one primary action.
                    variant="outline"
                    data-guide-id="drawer.next"
                    onClick={() => handle?.step?.next()}
                    disabled={busy}
                  >
                    {t("action.continue")}
                  </Button>
                )}
                <Button
                  type="button"
                  data-guide-id="drawer.save"
                  onClick={() => void submit()}
                  disabled={(!onSubmit && !handle) || busy || submitDisabled}
                >
                  {busy && <Loader2 className="animate-spin" />}
                  {submitLabel ?? t("action.save")}
                </Button>
              </>
            )}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
