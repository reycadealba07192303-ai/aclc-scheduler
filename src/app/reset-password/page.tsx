"use client";

import { BrandMark } from "@/frontend/components/layout/AppShell";
import { Button } from "@/frontend/components/ui/Button";
import { Field, Input } from "@/frontend/components/ui/Field";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowLeft, CheckCircle2, KeyRound, LockKeyhole, Mail } from "lucide-react";

type Step = "email" | "password" | "verify" | "done";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<Step>("email");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  function continueToPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStep("password");
  }

  async function sendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not request a verification code.");
      setMessage(result.message ?? "If an active account uses that email, a verification code will be sent.");
      setStep("verify");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not request a verification code.");
    } finally {
      setPending(false);
    }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const response = await fetch("/api/auth/password-reset/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not reset your password.");
      setStep("done");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not reset your password.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f3f5fa] px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <BrandMark className="h-10 w-10" />
          <div><p className="font-[family-name:var(--font-display)] text-lg font-bold text-ink">ACLC Scheduler</p><p className="text-sm text-ink-muted">Account recovery</p></div>
        </div>
        <section className="space-y-5 rounded-2xl border border-line bg-bg-elevated p-6 shadow-lg shadow-slate-900/5 sm:p-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">Forgot password</p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold text-ink">{step === "done" ? "Password updated" : "Reset your password"}</h1>
            <p className="mt-1 text-sm leading-5 text-ink-muted">
              {step === "email" ? "Enter the email registered to your account. Students should enter their school email to receive the OTP." : step === "password" ? "Create and confirm a new password. We’ll send a verification code to this email." : step === "verify" ? `Enter the six-digit code sent to ${email}.` : "Your new password is ready. Sign in with your email or student ID."}
            </p>
          </div>

          {error ? <p className="rounded-xl border border-danger/20 bg-danger-soft px-3.5 py-3 text-sm text-danger" role="alert">{error}</p> : null}
          {message && step === "verify" ? <p className="rounded-xl border border-ok/20 bg-ok-soft px-3.5 py-3 text-sm text-ok" role="status">{message}</p> : null}

          {step === "email" ? <form onSubmit={continueToPassword} className="space-y-4">
            <Field label="Registered email"><div className="relative"><Mail className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-muted" /><Input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoFocus placeholder="name@school.edu.ph" className="h-12 rounded-xl pl-11 text-[15px]" /></div></Field>
            <Button className="h-11 w-full rounded-xl" type="submit">Continue</Button>
          </form> : null}

          {step === "password" ? <form onSubmit={(event) => void sendCode(event)} className="space-y-4">
            <Field label="Registered email"><Input type="email" value={email} readOnly className="h-11 rounded-xl" /></Field>
            <Field label="New password"><div className="relative"><LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-muted" /><Input type="password" autoComplete="new-password" minLength={12} maxLength={200} value={password} onChange={(event) => setPassword(event.target.value)} required autoFocus className="h-11 rounded-xl pl-11" /></div></Field>
            <Field label="Confirm new password"><Input type="password" autoComplete="new-password" minLength={12} maxLength={200} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required className="h-11 rounded-xl" /></Field>
            <p className="-mt-2 text-xs text-ink-muted">Use at least 12 characters.</p>
            <Button className="h-11 w-full rounded-xl" type="submit" disabled={pending}>{pending ? <KeyRound className="h-4 w-4 animate-pulse" /> : <Mail className="h-4 w-4" />}{pending ? "Sending verification code..." : "Send verification code"}</Button>
          </form> : null}

          {step === "verify" ? <form onSubmit={(event) => void resetPassword(event)} className="space-y-4">
            <Field label="6-digit verification code"><Input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} required autoFocus className="h-12 rounded-xl text-center text-lg tracking-[0.35em]" /></Field>
            <p className="-mt-2 text-xs text-ink-muted">The code expires in 10 minutes. Check your inbox and spam folder.</p>
            <Button className="h-11 w-full rounded-xl" type="submit" disabled={pending || code.length !== 6}>{pending ? <KeyRound className="h-4 w-4 animate-pulse" /> : <CheckCircle2 className="h-4 w-4" />}{pending ? "Verifying..." : "Verify and reset password"}</Button>
            <button type="button" onClick={() => { setStep("password"); setCode(""); setError(""); }} className="w-full text-sm font-medium text-accent hover:underline">Back to password</button>
          </form> : null}

          {step === "done" ? <Button className="h-11 w-full rounded-xl" onClick={() => window.location.assign("/login")}>Back to sign in<ArrowLeft className="h-4 w-4" /></Button> : null}

          {step !== "done" ? <p className="border-t border-line pt-4 text-center text-sm text-ink-muted"><Link href="/login" className="inline-flex items-center gap-1.5 font-medium text-accent hover:underline"><ArrowLeft className="h-3.5 w-3.5" /> Back to sign in</Link></p> : null}
        </section>
      </div>
    </main>
  );
}
