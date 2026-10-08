import { cn } from "@/shared/lib/utils";

// Muted, readable backgrounds; the same name always gets the same color.
const PALETTE = [
  "bg-[#e0e7ff] text-[#1e3a8a]",
  "bg-[#fde2e4] text-[#9f1239]",
  "bg-[#dcfce7] text-[#166534]",
  "bg-[#fef3c7] text-[#92400e]",
  "bg-[#e0f2fe] text-[#075985]",
  "bg-[#f3e8ff] text-[#6b21a8]",
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const hash = [...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
        size === "sm" ? "h-8 w-8 text-xs" : size === "lg" ? "h-16 w-16 text-xl" : "h-9 w-9 text-[13px]",
        PALETTE[hash % PALETTE.length],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
