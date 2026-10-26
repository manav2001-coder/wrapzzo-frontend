import * as React from "react";

import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type AppDialogSize = "sm" | "md" | "lg" | "xl" | "full";

const SIZE_CLASSES: Record<AppDialogSize, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-[calc(100vw-2rem)]",
};

export interface AppDialogProps {
  open: boolean;
  /** Radix-native, replacing v4's `onClose(event, reason)`. */
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  size?: AppDialogSize;
  /** Omit to get the confirm/cancel shorthand below. */
  footer?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void | Promise<void>;
  confirmVariant?: ButtonProps["variant"];
  /** Spins confirm, disables the footer, and blocks dismissal. */
  loading?: boolean;
  /**
   * Holds confirm disabled while the body's own input is invalid — for a dialog that
   * COLLECTS something (`reset-password-dialog`) rather than merely asking yes/no.
   * Without it the only way to express "not valid yet" was to hand-roll the whole
   * footer, which is how a second, drifting copy of this shell gets written.
   */
  confirmDisabled?: boolean;
  /** v4's boolean `error`, upgraded to the message itself. */
  error?: string | null;
  /**
   * Make the body its own scroll area, taking whatever height the header and footer leave.
   * Default true, and every caller wants it.
   *
   * `DialogContent` caps the dialog at `100vh-4rem`, so turning this OFF means a body taller
   * than that overflows the dialog rather than scrolling inside it.
   */
  scrollBody?: boolean;
  hideCloseButton?: boolean;
  /** Blocks Escape and outside-click, so only an explicit action closes the dialog. */
  disableDismiss?: boolean;
  children?: React.ReactNode;
  className?: string;
}

/**
 * An opinionated dialog: title, description, scrollable body, and a confirm/cancel footer
 * with loading and error states. The `CustomDialog` equivalent.
 *
 * `item-list-dialog.tsx` and `file-upload-dialog.tsx` are deliberately NOT refactored onto
 * this — that would be a pure refactor with no behaviour change and a lot of test churn.
 */
export function AppDialog({
  open,
  onOpenChange,
  title,
  description,
  size = "md",
  footer,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  confirmVariant = "default",
  loading = false,
  confirmDisabled = false,
  error,
  scrollBody = true,
  hideCloseButton,
  disableDismiss,
  children,
  className,
}: AppDialogProps) {
  const blocked = loading || disableDismiss;

  return (
    <Dialog open={open} onOpenChange={(next) => !(blocked && !next) && onOpenChange(next)}>
      <DialogContent
        className={cn(SIZE_CLASSES[size], className)}
        showCloseButton={!hideCloseButton && !blocked}
        onEscapeKeyDown={(event) => blocked && event.preventDefault()}
        onPointerDownOutside={(event) => blocked && event.preventDefault()}
        onInteractOutside={(event) => blocked && event.preventDefault()}
      >
        {(title || description) && (
          <DialogHeader>
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
        )}

        {/*
          `-mx-1 px-1` is not decoration: `overflow-y-auto` computes `overflow-x` to `auto`
          too (CSS forbids one axis being `visible` while the other is not), so this box clips
          HORIZONTALLY as well. With zero padding a full-width field sat exactly flush with
          that clipping edge — measured at 0px of room — and its `focus-visible:ring-1`, drawn
          outside the border box, was shaved off. The negative margin puts the content back
          where it was, so nothing moves.
        */}
        <div className={cn(scrollBody && "-mx-1 min-h-0 flex-1 overflow-y-auto px-1 py-1")}>
          {children}
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <DialogFooter>
          {footer ?? (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                data-guide-id="dialog.cancel"
                onClick={() => onOpenChange(false)}
              >
                {cancelLabel}
              </Button>
              {onConfirm && (
                <Button
                  type="button"
                  variant={confirmVariant}
                  data-guide-id="dialog.confirm"
                  loading={loading}
                  disabled={confirmDisabled}
                  // Button's `loading` swaps children for a spinner, which would leave the
                  // control with no accessible name exactly while it matters most. An
                  // explicit label keeps it named throughout.
                  aria-label={confirmLabel}
                  onClick={() => void onConfirm()}
                >
                  {confirmLabel}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
