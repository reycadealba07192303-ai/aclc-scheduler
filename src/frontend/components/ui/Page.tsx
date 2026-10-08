import { cn } from "@/shared/lib/utils";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-ink">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-ink-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Panel({
  children,
  className,
  title,
  action,
  id,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  action?: ReactNode;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn("rounded-xl border border-line bg-bg-elevated shadow-sm", className)}
    >
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          {title ? (
            <h2 className="text-sm font-semibold text-ink">{title}</h2>
          ) : (
            <span />
          )}
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line bg-bg-elevated p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-ink-muted">{label}</p>
        {icon ? <div className="text-ink-muted">{icon}</div> : null}
      </div>
      <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-ink">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-ink-muted">{hint}</p> : null}
    </div>
  );
}

/** Underline tabs used at the top of list pages. */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: T; label: string; count?: number }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="mb-5 flex gap-6 overflow-x-auto overflow-y-hidden border-b border-line [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tabs.map((t) => {
        const on = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={cn(
              "-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 pb-2.5 pt-1 text-sm font-medium transition",
              on
                ? "border-accent text-accent"
                : "border-transparent text-ink-muted hover:text-ink",
            )}
          >
            {t.label}
            {t.count !== undefined ? (
              <span
                className={cn(
                  "rounded-full px-1.5 py-px text-xs",
                  on ? "bg-accent-soft text-accent" : "bg-bg text-ink-muted",
                )}
              >
                {t.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/** Table frame with a consistent header style. Rows are plain <tr>/<td>. */
export function TableCard({
  toolbar,
  children,
  className,
}: {
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-line bg-bg-elevated shadow-sm", className)}>
      {toolbar ? (
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
          {toolbar}
        </div>
      ) : null}
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export const th = "px-4 py-2.5 text-left text-xs font-medium text-ink-muted";
export const td = "px-4 py-3 text-sm text-ink";
