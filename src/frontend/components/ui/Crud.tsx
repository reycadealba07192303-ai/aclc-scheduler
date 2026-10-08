"use client";

import { Button } from "@/frontend/components/ui/Button";
import { TableCard, td, th } from "@/frontend/components/ui/Page";
import { cn } from "@/shared/lib/utils";
import { Pencil, Trash2, X } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";

/** Short-lived message at the bottom of the screen. */
export function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flash = (msg: string) => {
    setMessage(msg);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), 2800);
  };
  const toast = message ? (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white shadow-lg"
    >
      {message}
    </div>
  ) : null;
  return { flash, toast };
}

export function EmptyCard({
  icon,
  title,
  text,
  action,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-line bg-bg-elevated px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent">
        {icon}
      </div>
      <h2 className="mt-4 text-base font-semibold text-ink">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-ink-muted">{text}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function DataTable({
  head,
  rows,
  toolbar,
  onRowClick,
  maxBodyHeight,
}: {
  head: string[];
  rows: ReactNode[][];
  toolbar?: ReactNode;
  /** Makes the whole row clickable (buttons inside still work on their own). */
  onRowClick?: (index: number) => void;
  /** Adds an independently scrollable table body while keeping its header visible. */
  maxBodyHeight?: number;
}) {
  return (
    <TableCard toolbar={toolbar}>
      <div className={maxBodyHeight ? "overflow-auto" : undefined} style={maxBodyHeight ? { maxHeight: maxBodyHeight } : undefined}>
        <table className="w-full min-w-[640px]">
          <thead className={maxBodyHeight ? "sticky top-0 z-10 bg-bg/95 shadow-sm" : "bg-bg/70"}>
            <tr>
              {head.map((h, i) => (
                <th key={i} className={th}>
                  {h || <span className="sr-only">Actions</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((cells, i) => (
              <tr
                key={i}
                onClick={onRowClick ? () => onRowClick(i) : undefined}
                className={cn("transition hover:bg-bg/60", onRowClick && "cursor-pointer")}
              >
                {cells.map((cell, j) => (
                  <td key={j} className={td}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TableCard>
  );
}

/** Edit + delete icon buttons for a table row. Clicks don't trigger the row's own click. */
export function RowActions({
  onEdit,
  onDelete,
  children,
}: {
  onEdit?: () => void;
  onDelete?: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
      {children}
      {onEdit ? (
        <Button variant="ghost" className="h-8 w-8 px-0" title="Edit" aria-label="Edit" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </Button>
      ) : null}
      {onDelete ? (
        <Button
          variant="ghost"
          className="h-8 w-8 px-0 hover:bg-danger-soft hover:text-danger"
          title="Delete"
          aria-label="Delete"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}

export function EditModal({
  title,
  children,
  onClose,
  onSubmit,
  onDelete,
  submitLabel = "Save",
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  onSubmit: (fd: FormData) => void;
  onDelete?: () => void;
  submitLabel?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <form
        className="w-full max-w-md rounded-xl border border-line bg-bg-elevated shadow-xl"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(new FormData(e.currentTarget));
        }}
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-ink-muted hover:bg-bg hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 px-6 py-5">{children}</div>
        <div className="flex items-center justify-between gap-2 border-t border-line bg-bg/50 px-6 py-3.5">
          {onDelete ? (
            <Button type="button" variant="danger-ghost" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">{submitLabel}</Button>
          </div>
        </div>
      </form>
    </div>
  );
}
