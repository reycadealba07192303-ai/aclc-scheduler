"use client";

import { cn } from "@/shared/lib/utils";
import { Bell, CalendarDays, CheckCheck, ClipboardCheck, UserCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
};

const POLL_MS = 30_000;

/** The signed-in user's notifications, refreshed every 30 seconds. */
export function useNotifications() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (!response.ok) return;
      const result = await response.json();
      setItems(result.notifications as AppNotification[]);
      setUnread(Number(result.unread ?? 0));
    } catch {
      // Offline or signed out; keep what is shown.
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    const poll = window.setInterval(() => void refresh(), POLL_MS);
    return () => window.clearInterval(poll);
  }, [refresh]);

  const markRead = useCallback(async (ids?: string[]) => {
    setItems((current) => current.map((item) => (!ids || ids.includes(item.id) ? { ...item, read: true } : item)));
    setUnread((count) => (ids ? Math.max(0, count - ids.length) : 0));
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ids ? { ids } : { all: true }),
    }).catch(() => undefined);
  }, []);

  return { items, unread, refresh, markRead };
}

function ago(value: string) {
  const seconds = Math.max(0, (Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 7 * 86_400) return `${Math.floor(seconds / 86_400)}d ago`;
  return new Date(value).toLocaleDateString([], { month: "short", day: "numeric" });
}

const icons = { schedule: CalendarDays, attendance: ClipboardCheck, account: UserCheck } as const;

/** Bell button with an unread badge and a dropdown list of notifications. */
export function NotificationBell({
  state,
  align = "left",
  className,
}: {
  state: ReturnType<typeof useNotifications>;
  align?: "left" | "right";
  className?: string;
}) {
  const { items, unread, refresh, markRead } = state;
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onPointer); document.removeEventListener("keydown", onKey); };
  }, [open]);

  function openItem(item: AppNotification) {
    if (!item.read) void markRead([item.id]);
    setOpen(false);
    if (item.link) router.push(item.link);
  }

  return <div ref={root} className={cn("relative", className)}>
    <button
      type="button"
      onClick={() => { setOpen((value) => !value); if (!open) void refresh(); }}
      aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
      aria-expanded={open}
      className="relative rounded-lg p-2 text-ink-muted transition hover:bg-bg hover:text-ink"
    >
      <Bell className="h-[18px] w-[18px]" />
      {unread ? <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold leading-none text-white">{unread > 9 ? "9+" : unread}</span> : null}
    </button>

    {open ? <div
      role="dialog"
      aria-label="Notifications"
      className={cn(
        "absolute top-full z-50 mt-2 w-[min(380px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-line bg-bg-elevated shadow-2xl",
        align === "left" ? "left-0" : "right-0",
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <p className="text-sm font-semibold text-ink">Notifications</p>
        {unread ? <button type="button" onClick={() => void markRead()} className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"><CheckCheck className="h-3.5 w-3.5" />Mark all read</button> : null}
      </div>
      {items.length ? <ul className="max-h-[420px] divide-y divide-line/70 overflow-y-auto">
        {items.map((item) => {
          const Icon = icons[item.type as keyof typeof icons] ?? Bell;
          return <li key={item.id}>
            <button type="button" onClick={() => openItem(item)} className={cn("flex w-full gap-3 px-4 py-3 text-left transition hover:bg-bg", !item.read && "bg-accent-soft/40")}>
              <span className={cn("mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg", item.read ? "bg-bg text-ink-muted" : "bg-accent-soft text-accent")}><Icon className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1">
                <span className="flex items-start gap-2">
                  <span className={cn("flex-1 text-sm leading-snug text-ink", !item.read && "font-semibold")}>{item.title}</span>
                  {!item.read ? <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" /> : null}
                </span>
                {item.body ? <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted">{item.body}</span> : null}
                <span className="mt-1 block font-mono text-[10.5px] text-ink-muted/80">{ago(item.createdAt)}</span>
              </span>
            </button>
          </li>;
        })}
      </ul> : <div className="px-6 py-10 text-center">
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-bg text-ink-muted"><Bell className="h-5 w-5" /></span>
        <p className="mt-3 text-sm font-semibold text-ink">You&apos;re all caught up</p>
        <p className="mt-1 text-xs text-ink-muted">Schedule changes and attendance updates will show up here.</p>
      </div>}
    </div> : null}
  </div>;
}
