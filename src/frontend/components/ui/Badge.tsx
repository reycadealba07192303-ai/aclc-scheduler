import { cn } from "@/shared/lib/utils";
import type { ReactNode } from "react";

export function Badge({
  children,
  tone = "neutral",
  dot = false,
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "ok" | "warn" | "danger" | "info" | "accent" | "brand";
  /** Small leading dot, for statuses. */
  dot?: boolean;
  className?: string;
}) {
  const tones = {
    neutral: "bg-bg text-ink-muted ring-line",
    ok: "bg-ok-soft text-ok ring-ok/20",
    warn: "bg-warn-soft text-warn ring-warn/20",
    danger: "bg-danger-soft text-danger ring-danger/20",
    info: "bg-info-soft text-info ring-info/20",
    accent: "bg-accent-soft text-accent ring-accent/15",
    brand: "bg-brand-soft text-brand ring-brand/20",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        tones[tone],
        className,
      )}
    >
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}
