"use client";

import { BrandMark } from "@/frontend/components/layout/AppShell";
import { Button } from "@/frontend/components/ui/Button";
import { Field, Input } from "@/frontend/components/ui/Field";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowLeft, CheckCircle2, KeyRound, Mail } from "lucide-react";

export default function CreatePasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState<"email" | "password" | "verify">("email");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const identifierIsEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier.trim());

  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    setPending(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/auth/password-setup/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, ...(identifierIsEmail ? {} : { email }) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not request a verification code.");
      setStep("verify");
      setMessage(result.message ?? "If an eligible account exists, a verification code will be sent.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not request a verification code.");
    } finally {
      setPending(false);
    }
  }

  function continueWithEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (identifierIsEmail) setEmail(identifier.trim().toLowerCase());
    setStep("password");
  }

  async function finishSetup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/auth/password-setup/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not create your password.");
      window.location.assign(result.role === "student" ? "/student" : "/teacher");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create your password.");
    } finally {
      setPending(false);
    }
  }

  async function resendCode() {
    setPending(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/auth/password-setup/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, ...(identifierIsEmail ? {} : { email }) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not resend the verification code.");
      setCode("");
      setMessage(result.message ?? "Verification code sent. Check your inbox and spam folder.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not resend the verification code.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-7 flex items-center gap-3">
          <BrandMark />
          <div>
            <p className="font-[family-name:var(--font-display)] text-lg font-bold text-ink">ACLC Scheduler</p>
            <p className="text-sm text-ink-muted">Teacher and student account setup</p>
          </div>
        </div>

        <section className="space-y-5 rounded-2xl border border-line bg-bg-elevated p-6 shadow-sm sm:p-8">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-ink">Create your password</h1>
            <p className="mt-1 text-sm text-ink-muted">
              {step === "email" ? "Teachers: enter your registered teacher email. Students: enter your student ID and any personal email you can access for the verification code." : step === "password" ? "Create and confirm your password. We’ll email you a verification code next." : "Enter the verification code sent to your email to finish setting up your account."}
            </p>
          </div>

          {error ? <p className="rounded-lg border border-danger/20 bg-danger-soft px-3 py-2.5 text-sm text-danger" role="alert">{error}</p> : null}
          {message ? <p className="rounded-lg border border-ok/20 bg-ok-soft px-3 py-2.5 text-sm text-ok" role="status">{message}</p> : null}

          {step === "email" ? (
            <form onSubmit={continueWithEmail} className="space-y-4">
              <Field label="Teacher email or student ID">
                <Input type="text" autoComplete="username" value={identifier} onChange={(event) => { setIdentifier(event.target.value); if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(event.target.value.trim())) setEmail(event.target.value.trim().toLowerCase()); else setEmail(""); }} required autoFocus placeholder="Teacher email or student ID" />
              </Field>
              {identifier.trim() && !identifierIsEmail ? <Field label="Student's personal email"><Input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="you@example.com" /></Field> : null}
              <Button className="w-full" type="submit">Continue</Button>
            </form>
          ) : null}

          {step === "password" ? (
            <form onSubmit={requestCode} className="space-y-4">
              <Field label="Account">
                <Input type="text" value={identifier} readOnly required />
              </Field>
              <Field label="OTP will be sent to">
                <Input type="email" value={email || identifier} readOnly required />
              </Field>
              <Field label="Create password">
                <Input type="password" autoComplete="new-password" minLength={12} maxLength={200} value={password} onChange={(event) => setPassword(event.target.value)} required autoFocus />
              </Field>
              <Field label="Confirm password">
                <Input type="password" autoComplete="new-password" minLength={12} maxLength={200} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
              </Field>
              <p className="-mt-2 text-xs text-ink-muted">Use at least 12 characters.</p>
              <Button className="w-full" type="submit" disabled={pending}>
                <Mail className={`h-4 w-4${pending ? " animate-pulse" : ""}`} />
                {pending ? "Sending verification code..." : "Create password and send OTP"}
              </Button>
              <button type="button" onClick={() => { setStep("email"); setPassword(""); setConfirmPassword(""); setMessage(""); setError(""); }} className="w-full text-sm font-medium text-accent hover:underline">
                Change account
              </button>
            </form>
          ) : null}

          {step === "verify" ? (
            <form onSubmit={finishSetup} className="space-y-4">
              <Field label="Account">
                <Input type="text" value={identifier} readOnly required />
              </Field>
              <Field label="Verification email">
                <Input type="email" value={email || identifier} readOnly required />
              </Field>
              <Field label="6-digit verification code">
                <Input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} required autoFocus />
              </Field>
              <p className="-mt-2 text-xs text-ink-muted">The code expires in 10 minutes.</p>
              <Button className="w-full" type="submit" disabled={pending || code.length !== 6}>
                {pending ? <KeyRound className="h-4 w-4 animate-pulse" /> : <CheckCircle2 className="h-4 w-4" />}
                {pending ? "Verifying..." : "Verify and create account"}
              </Button>
              <button type="button" onClick={() => { setStep("password"); setCode(""); setMessage(""); setError(""); }} className="w-full text-sm font-medium text-accent hover:underline">
                Back to password
              </button>
              <button type="button" onClick={() => void resendCode()} disabled={pending} className="w-full text-sm font-medium text-accent hover:underline disabled:opacity-50">
                {pending ? "Requesting another code..." : "Didn’t receive the code? Resend OTP"}
              </button>
            </form>
          ) : null}

          <p className="border-t border-line pt-4 text-center text-sm text-ink-muted">
            <Link href="/login" className="inline-flex items-center gap-1.5 font-medium text-accent hover:underline"><ArrowLeft className="h-3.5 w-3.5" /> Back to sign in</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
