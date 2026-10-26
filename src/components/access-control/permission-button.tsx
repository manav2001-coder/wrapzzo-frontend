import { useTranslation } from "react-i18next";

import { Button, type ButtonProps } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useHasAccess } from "@/hooks/use-permission";

export interface PermissionButtonProps extends ButtonProps {
  permission?: string;
  permissions?: readonly string[];
  requireAll?: boolean;
  /** Hide instead of disabling. v4's tables default to hiding for primary actions. */
  hideIfNoPermission?: boolean;
  /** Explain the disabled state on hover. Only applies when the button is shown. */
  showTooltip?: boolean;
}

/**
 * A button that knows what it needs — v4's `PermissionButton`.
 *
 * Denied behaviour is a real choice, not a detail: `hideIfNoPermission` removes it, which
 * suits a primary action nobody without the permission should even know exists; the default
 * DISABLES it with a tooltip, which suits a row action where a missing button would leave a
 * confusing gap in a column of them.
 */
export function PermissionButton({
  permission,
  permissions,
  requireAll = false,
  hideIfNoPermission = false,
  showTooltip = true,
  children,
  disabled,
  ...buttonProps
}: PermissionButtonProps) {
  const { t } = useTranslation("common");
  // Unconditional, unlike v4's — see the note on `PermissionGate`.
  const allowed = useHasAccess(permission ?? permissions, requireAll);

  const ungated =
    permission === undefined && (permissions === undefined || permissions.length === 0);
  const hasAccess = ungated || allowed;

  if (!hasAccess && hideIfNoPermission) return null;

  const button = (
    <Button disabled={disabled || !hasAccess} {...buttonProps}>
      {children}
    </Button>
  );

  if (hasAccess || !showTooltip) return button;

  // A disabled button emits no pointer events, so the trigger has to wrap it in something
  // that does — otherwise the tooltip explaining WHY it is disabled never appears.
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">{button}</span>
      </TooltipTrigger>
      <TooltipContent>{t("permission.insufficient")}</TooltipContent>
    </Tooltip>
  );
}

export default PermissionButton;
