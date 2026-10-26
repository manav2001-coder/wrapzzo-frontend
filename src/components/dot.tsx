import { cn } from "@/lib/utils";

export interface DotProps {
  color?: "primary" | "secondary" | "success" | "warning" | "destructive" | "muted";
  size?: number;
  variant?: "filled" | "outlined";
  /** A soft ring spreads from the dot and fades: something live. Still when motion is reduced. */
  pulse?: boolean;
  className?: string;
}

const BG_CLASSES: Record<NonNullable<DotProps["color"]>, string> = {
  primary: "bg-primary",
  secondary: "bg-secondary",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  muted: "bg-muted-foreground",
};

const BORDER_CLASSES: Record<NonNullable<DotProps["color"]>, string> = {
  primary: "border-primary",
  secondary: "border-secondary",
  success: "border-success",
  warning: "border-warning",
  destructive: "border-destructive",
  muted: "border-muted-foreground",
};

export function Dot({
  color = "primary",
  size = 8,
  variant = "filled",
  pulse = false,
  className,
}: DotProps) {
  const dot = (
    <span
      className={cn(
        "inline-block rounded-full",
        variant === "outlined"
          ? cn("border-2 bg-transparent", BORDER_CLASSES[color])
          : BG_CLASSES[color],
        className,
      )}
      style={{ width: size, height: size }}
    />
  );
  if (!pulse) return dot;
  return (
    <span className="relative inline-flex">
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-0 rounded-full opacity-75 motion-safe:animate-ping",
          BG_CLASSES[color],
        )}
      />
      {dot}
    </span>
  );
}
