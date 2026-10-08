"use client";

import { BrandMark } from "@/frontend/components/layout/AppShell";
import { Button } from "@/frontend/components/ui/Button";
import { Field, Input } from "@/frontend/components/ui/Field";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";

export default function SetupAdminPage() {
  const [canBootstrap, setCanBootstrap] = useState<boolean | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [setupKey, setSetupKey] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    fetch("/api/auth/setup-status")
      .then((response) => response.json())
      .then((result) => setCanBootstrap(Boolean(result.canBootstrap)))
      .catch(() => setCanBootstrap(false));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/auth/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, password, setupKey }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not set up the administrator.");
      window.location.assign("/admin");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not set up the administrator.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-7 flex items-center gap-3">
          <BrandMark />
          <div>
            <p className="font-[family-name:var(--font-display)] text-lg font-bold text-ink">ACLC Scheduler</p>
            <p className="text-sm text-ink-muted">One-time administrator setup</p>
          </div>
        </div>

        {canBootstrap === null ? (
          <div className="rounded-2xl border border-line bg-bg-elevated p-8 text-center text-sm text-ink-muted">Checking account setup...</div>
        ) : !canBootstrap ? (
          <div className="rounded-2xl border border-line bg-bg-elevated p-8 text-center shadow-sm">
            <h1 className="font-[family-name:var(--font-display)] text-xl font-bold text-ink">Setup is closed</h1>
            <p className="mt-2 text-sm text-ink-muted">The first administrator has already been created or setup is not configured.</p>
            <Link href="/login" className="mt-5 inline-block text-sm font-semibold text-accent hover:underline">Go to sign in</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 rounded-2xl border border-line bg-bg-elevated p-6 shadow-sm sm:p-8">
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent"><ShieldCheck className="h-5 w-5" /></div>
              <div>
                <h1 className="font-[family-name:var(--font-display)] text-xl font-bold text-ink">Create the first administrator</h1>
                <p className="text-sm text-ink-muted">This one-time setup closes after the account is created.</p>
              </div>
            </div>

            {error ? <p className="rounded-lg border border-danger/20 bg-danger-soft px-3 py-2.5 text-sm text-danger" role="alert">{error}</p> : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First name"><Input value={firstName} onChange={(event) => setFirstName(event.target.value)} required autoComplete="given-name" /></Field>
              <Field label="Last name"><Input value={lastName} onChange={(event) => setLastName(event.target.value)} required autoComplete="family-name" /></Field>
            </div>
            <Field label="Email"><Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /></Field>
            <Field label="Setup key"><Input type="password" value={setupKey} onChange={(event) => setSetupKey(event.target.value)} required autoComplete="off" /></Field>
            <Field label="Password"><Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={12} autoComplete="new-password" /><span className="mt-1 block text-xs text-ink-muted">Use at least 12 characters.</span></Field>
            <Field label="Confirm password"><Input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={12} autoComplete="new-password" /></Field>

            <Button type="submit" className="w-full" disabled={pending}>
              <ShieldCheck className="h-4 w-4" />
              {pending ? "Creating account..." : "Create administrator account"}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
