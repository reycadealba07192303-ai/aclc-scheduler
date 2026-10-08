"use client";

import { Badge } from "@/frontend/components/ui/Badge";
import { Button } from "@/frontend/components/ui/Button";
import { PageHeader, Tabs } from "@/frontend/components/ui/Page";
import { CalendarDays, ClipboardCheck, History, LoaderCircle, Settings2, UserCog, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type Category = "schedule" | "roster" | "setup" | "attendance" | "account";
type AuditEntry = { id: string; category: Category; action: string; summary: string; actorName: string; actorRole: string; createdAt: string };
type Filter = "all" | Category;

const icons = { schedule: CalendarDays, roster: Users, setup: Settings2, attendance: ClipboardCheck, account: UserCog } as const;
const roleTone = { admin: "accent", teacher: "info", student: "ok", system: "neutral" } as const;

function dayLabel(value: string) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

/** Who changed what: schedules, rosters, setup records, attendance marks, and accounts. */
export default function ActivityPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [events, setEvents] = useState<AuditEntry[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (append: boolean, before?: string) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("category", filter);
      if (before) params.set("before", before);
      const response = await fetch(`/api/admin/activity?${params}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not load the activity log.");
      setEvents((current) => (append ? [...current, ...result.events] : result.events));
      setHasMore(Boolean(result.hasMore));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load the activity log.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(false);
  }, [load]);

  const groups: { label: string; items: AuditEntry[] }[] = [];
  for (const event of events) {
    const label = dayLabel(event.createdAt);
    const group = groups.at(-1);
    if (group?.label === label) group.items.push(event);
    else groups.push({ label, items: [event] });
  }

  return <div>
    <PageHeader title="Activity log" description="Who changed what: schedules, rosters, setup records, attendance marks, and accounts. Entries are kept for one year." />
    <Tabs
      tabs={[
        { id: "all" as const, label: "All" },
        { id: "schedule" as const, label: "Schedule" },
        { id: "roster" as const, label: "Rosters" },
        { id: "setup" as const, label: "Setup" },
        { id: "attendance" as const, label: "Attendance" },
        { id: "account" as const, label: "Accounts" },
      ]}
      value={filter}
      onChange={setFilter}
    />
    {error ? <p role="alert" className="mb-4 rounded-lg border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p> : null}
    {!loading && !events.length && !error ? <div className="rounded-xl border border-dashed border-line bg-bg-elevated px-6 py-14 text-center">
      <History className="mx-auto h-8 w-8 text-ink-muted" />
      <p className="mt-3 text-sm font-semibold text-ink">No activity yet</p>
      <p className="mt-1 text-sm text-ink-muted">Changes made from now on will be listed here.</p>
    </div> : <div className="space-y-5">
      {groups.map((group) => <section key={group.label} className="overflow-hidden rounded-xl border border-line bg-bg-elevated shadow-sm">
        <h2 className="border-b border-line bg-bg/60 px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">{group.label}</h2>
        <ul className="divide-y divide-line/70">
          {group.items.map((event) => {
            const Icon = icons[event.category] ?? History;
            return <li key={event.id} className="flex items-start gap-3 px-5 py-3">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent"><Icon className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink">{event.summary}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                  <span>{event.actorName}</span>
                  <Badge tone={roleTone[event.actorRole as keyof typeof roleTone] ?? "neutral"}>{event.actorRole}</Badge>
                </p>
              </div>
              <time className="shrink-0 font-mono text-xs text-ink-muted" dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time>
            </li>;
          })}
        </ul>
      </section>)}
    </div>}
    {loading ? <p className="flex items-center justify-center gap-2 py-6 text-sm text-ink-muted"><LoaderCircle className="h-4 w-4 animate-spin" />Loading activity…</p> : null}
    {hasMore && !loading ? <div className="mt-5 text-center"><Button variant="secondary" onClick={() => void load(true, events.at(-1)?.createdAt)}>Load older activity</Button></div> : null}
  </div>;
}
