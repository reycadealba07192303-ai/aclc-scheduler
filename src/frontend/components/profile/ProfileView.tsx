"use client";

import { Avatar } from "@/frontend/components/ui/Avatar";
import { Button } from "@/frontend/components/ui/Button";
import { Field, Input } from "@/frontend/components/ui/Field";
import { CheckCircle2, Eye, EyeOff, KeyRound, LoaderCircle, LogOut, ShieldCheck } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";

type Item = { label: string; value: string };
type Profile = { name: string; role: "admin" | "teacher" | "student"; memberSince: string | null; details: Item[]; stats: Item[] };

const roleLabel = { admin: "Super Administrator", teacher: "Teacher", student: "Student" } as const;

/** Profile page for every role: identity, role-specific numbers, and password change. */
export function ProfileView() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/profile", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Could not load your profile.");
        if (active) setProfile(result.profile as Profile);
      })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Could not load your profile."); });
    return () => { active = false; };
  }, []);

  async function signOut() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.assign("/login");
    }
  }

  if (error) return <p role="alert" className="rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>;
  if (!profile) return <div className="space-y-4"><div className="h-40 animate-pulse rounded-3xl bg-bg-elevated" /><div className="h-64 animate-pulse rounded-2xl bg-bg-elevated" /></div>;

  return <div className="mx-auto max-w-4xl">
    <section className="relative overflow-hidden rounded-3xl bg-[#070d1f] px-6 py-7 text-white shadow-[0_24px_50px_-28px_rgba(15,30,90,0.7)] sm:px-8">
      <div aria-hidden className="pointer-events-none absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(ellipse_at_top_right,black_10%,transparent_70%)]" />
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(59,100,224,0.5),transparent_65%)]" />
      <div className="relative flex flex-wrap items-center gap-5">
        <span className="rounded-full bg-white/10 p-1 ring-1 ring-white/15"><Avatar name={profile.name} size="lg" /></span>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#b9c9ff]">{roleLabel[profile.role]}</p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight sm:text-[28px]">{profile.name}</h1>
          <p className="mt-1 text-sm text-white/60">{profile.details.find((item) => item.label === "Email")?.value}{profile.memberSince ? ` · Member since ${new Date(profile.memberSince).toLocaleDateString([], { month: "long", year: "numeric" })}` : ""}</p>
        </div>
        <Button variant="secondary" onClick={() => void signOut()} className="border-white/15 bg-white/10 text-white hover:bg-white/15"><LogOut className="h-4 w-4" />Sign out</Button>
      </div>
    </section>

    {profile.stats.length ? <div className={`mt-5 grid gap-3 ${profile.stats.length === 4 ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-1 sm:grid-cols-3"}`}>
      {profile.stats.map((stat) => <div key={stat.label} className="rounded-2xl border border-line bg-bg-elevated px-4 py-3.5 shadow-sm">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-muted">{stat.label}</p>
        <p className="mt-1.5 font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-ink">{stat.value}</p>
      </div>)}
    </div> : null}

    <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]">
      <section className="rounded-2xl border border-line bg-bg-elevated shadow-sm">
        <h2 className="border-b border-line px-5 py-4 text-sm font-semibold text-ink">Account details</h2>
        <dl className="divide-y divide-line/70">
          {profile.details.map((item) => <div key={item.label} className="flex items-start justify-between gap-4 px-5 py-3">
            <dt className="text-sm text-ink-muted">{item.label}</dt>
            <dd className="min-w-0 break-words text-right text-sm font-medium text-ink">{item.value}</dd>
          </div>)}
        </dl>
        <p className="border-t border-line px-5 py-3 text-xs text-ink-muted">Need to correct your name or ID? Ask your school administrator.</p>
      </section>
      <ChangePasswordCard />
    </div>
  </div>;
}

function ChangePasswordCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setDone(false);
    if (next.length < 12) return setError("Use at least 12 characters for your new password.");
    if (next !== confirm) return setError("The new passwords do not match.");
    setPending(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not change your password.");
      setCurrent(""); setNext(""); setConfirm("");
      setDone(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not change your password.");
    } finally {
      setPending(false);
    }
  }

  const type = show ? "text" : "password";
  return <section className="rounded-2xl border border-line bg-bg-elevated shadow-sm">
    <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-ink"><KeyRound className="h-4 w-4 text-ink-muted" />Change password</h2>
      <button type="button" onClick={() => setShow((value) => !value)} className="inline-flex items-center gap-1 text-xs font-medium text-ink-muted hover:text-ink">
        {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}{show ? "Hide" : "Show"}
      </button>
    </div>
    <form onSubmit={submit} className="space-y-3.5 px-5 py-4">
      {error ? <p role="alert" className="rounded-lg border border-danger/20 bg-danger-soft px-3 py-2.5 text-sm text-danger">{error}</p> : null}
      {done ? <p className="flex items-center gap-2 rounded-lg border border-ok/25 bg-ok-soft px-3 py-2.5 text-sm text-ok"><CheckCircle2 className="h-4 w-4" />Password changed. Other devices were signed out.</p> : null}
      <Field label="Current password"><Input type={type} autoComplete="current-password" value={current} onChange={(event) => setCurrent(event.target.value)} required /></Field>
      <Field label="New password"><Input type={type} autoComplete="new-password" value={next} onChange={(event) => setNext(event.target.value)} required minLength={12} /></Field>
      <Field label="Confirm new password"><Input type={type} autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} required /></Field>
      <p className="flex items-center gap-1.5 text-xs text-ink-muted"><ShieldCheck className="h-3.5 w-3.5" />At least 12 characters. You stay signed in here; other devices are signed out.</p>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
        {pending ? "Saving..." : "Update password"}
      </Button>
    </form>
  </section>;
}
