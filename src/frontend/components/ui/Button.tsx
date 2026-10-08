import { cn } from "@/shared/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "danger-ghost" | "warn";

const styles: Record<Variant, string> = {
  primary: "bg-accent text-white shadow-sm hover:bg-accent-strong",
  secondary: "border border-line bg-bg-elevated text-ink shadow-sm hover:bg-bg",
  ghost: "bg-transparent text-ink-muted hover:bg-bg hover:text-ink",
  danger: "bg-danger text-white shadow-sm hover:bg-danger/90",
  "danger-ghost": "bg-transparent text-danger hover:bg-danger-soft",
  warn: "bg-warn text-white hover:bg-warn/90",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        styles[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
