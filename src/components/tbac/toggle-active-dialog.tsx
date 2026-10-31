import { useTranslation } from "react-i18next";

import { AppDialog } from "@/components/app-dialog";

/**
 * The activate / deactivate confirmation shared by Feature Master and Template Master.
 *
 * Both screens replace hard delete with a toggle (v4 does the same — a feature key is what
 * route guards match on, and a template is a live grant), so both need the same dialog with
 * the wording flipped by the row's current state. It was written out twice, identically
 * apart from the i18n prefix, which is how the two copies would have drifted.
 *
 * `keyPrefix` selects the `<prefix>.activate.*` / `<prefix>.deactivate.*` strings in the
 * `tbac` namespace; the buttons come from `common` because every dialog in the app shares
 * them. `children` is the row identifier the screen wants shown — a feature's key in mono,
 * a template's name in prose.
 */
export function ToggleActiveDialog({
  active,
  open,
  keyPrefix,
  busy,
  onCancel,
  onConfirm,
  children,
}: {
  /** The row's CURRENT state — `true` means the confirm button deactivates it. */
  active: boolean | undefined;
  open: boolean;
  keyPrefix: "featureMaster" | "templateMaster";
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
  children?: React.ReactNode;
}) {
  const { t } = useTranslation(["tbac", "common"]);
  const verb = active ? "deactivate" : "activate";

  return (
    <AppDialog
      open={open}
      onOpenChange={(next) => !next && onCancel()}
      size="sm"
      title={t(`${keyPrefix}.${verb}.title`)}
      description={t(`${keyPrefix}.${verb}.body`)}
      confirmLabel={
        active ? t("action.deactivate", { ns: "common" }) : t("action.confirm", { ns: "common" })
      }
      cancelLabel={t("action.cancel", { ns: "common" })}
      confirmVariant={active ? "destructive" : "default"}
      loading={busy}
      onConfirm={onConfirm}
    >
      {children}
    </AppDialog>
  );
}
