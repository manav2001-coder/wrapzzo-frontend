import { Checkbox } from "@/components/ui/checkbox";

interface IndeterminateCheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onCheckedChange: (checked: boolean) => void;
  "aria-label"?: string;
}

export function IndeterminateCheckbox({
  checked,
  indeterminate,
  onCheckedChange,
  "aria-label": ariaLabel,
}: IndeterminateCheckboxProps) {
  return (
    <Checkbox
      checked={indeterminate ? "indeterminate" : checked}
      onCheckedChange={(state) => onCheckedChange(state === true)}
      aria-label={ariaLabel}
    />
  );
}
