"use client";

import { Button } from "@/frontend/components/ui/Button";
import { Field, Input } from "@/frontend/components/ui/Field";
import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Eye,
  EyeOff,
  History,
  KeyRound,
  LockKeyhole,
  LogIn,
  QrCode,
  ShieldCheck,
  UserRound,
} from "lucide-react";

const highlights = [
  { icon: CalendarDays, title: "Class schedules", text: "Your week at a glance" },
  { icon: QrCode, title: "QR attendance", text: "Scan in seconds" },
  { icon: History, title: "Attendance history", text: "Every class, recorded" },
];

function SchoolLogo({ size, className }: { size: number; className?: string }) {
  return <span className={`inline-flex shrink-0 rounded-full bg-white p-[3px] shadow-lg shadow-black/25 ${className ?? ""}`}>
    <Image src="/aclc-logo.png" alt="ACLC College Manila Campus" width={size} height={size} loading="eager" className="rounded-full" />
  </span>;
}

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not sign in.");
      window.location.assign(result.role === "admin" ? "/admin" : result.role === "student" ? "/student" : "/teacher");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not sign in.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="relative flex h-dvh min-h-0 items-center justify-center overflow-hidden bg-[#f3f5fa] p-0">
      <div aria-hidden="true" className="pointer-events-none absolute -left-32 -top-36 h-96 w-96 rounded-full bg-blue-200/35 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-48 -right-24 h-[30rem] w-[30rem] rounded-full bg-rose-100/50 blur-3xl" />

      <div className="relative h-full w-full">
        <div className="grid h-full min-h-0 overflow-hidden bg-bg-elevated md:grid-cols-[0.94fr_1.06fr]">
          <aside className="relative hidden min-h-0 flex-col justify-between overflow-hidden bg-[#070d1f] p-9 text-white md:flex lg:p-12">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.055)_1px,transparent_1px)] [background-size:40px_40px] [mask-image:radial-gradient(ellipse_at_50%_35%,black_15%,transparent_70%)]" />
            <div aria-hidden="true" className="pointer-events-none absolute -right-40 -top-48 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(59,100,224,0.5),transparent_65%)]" />
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-56 -left-40 h-[460px] w-[460px] rounded-full bg-[radial-gradient(circle,rgba(203,24,52,0.28),transparent_65%)]" />

            <Link href="/" title="Back to the ACLC Scheduler home page" className="relative z-10 flex w-fit items-center gap-3 rounded-xl transition hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/60">
              <SchoolLogo size={40} />
              <div>
                <p className="font-[family-name:var(--font-display)] text-[17px] font-bold leading-tight">ACLC College</p>
                <p className="mt-0.5 font-mono text-[11px] tracking-wide text-blue-100/60">MANILA CAMPUS · SCHEDULER</p>
              </div>
            </Link>

            <div className="relative z-10 my-8">
              <div className="relative mb-9 w-fit [@media(max-height:760px)]:mb-6">
                <div aria-hidden="true" className="absolute -inset-10 rounded-full bg-[radial-gradient(circle,rgba(110,146,255,0.35),transparent_68%)]" />
                <div aria-hidden="true" className="absolute -inset-4 rounded-full border border-white/10" />
                <div aria-hidden="true" className="absolute -inset-8 rounded-full border border-white/[0.06]" />
                <SchoolLogo size={132} className="relative p-1 shadow-2xl shadow-[#3b64e0]/30 [@media(max-height:760px)]:[&_img]:h-24 [@media(max-height:760px)]:[&_img]:w-24" />
              </div>
              <p className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-3 py-1 font-mono text-[11px] tracking-wide text-blue-100/85">
                <span className="h-1.5 w-1.5 rounded-full bg-[#4ade80]" />ACADEMIC PORTAL
              </p>
              <h2 className="mt-4 max-w-md font-[family-name:var(--font-display)] text-4xl font-bold leading-[1.08] tracking-tight lg:text-[44px]">
                Your school day,<br />
                <span className="bg-gradient-to-r from-[#b9c9ff] to-[#6e92ff] bg-clip-text text-transparent">all in one place.</span>
              </h2>
              <p className="mt-4 max-w-sm text-[15px] leading-6 text-blue-100/65">Sign in to see your classes, schedule, and attendance, whether you teach or study at ACLC.</p>

              <ul className="mt-8 hidden max-w-lg grid-cols-3 gap-2.5 xl:grid [@media(max-height:760px)]:hidden">
                {highlights.map(({ icon: Icon, title, text }) => <li key={title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 backdrop-blur-sm">
                  <Icon className="h-[18px] w-[18px] text-[#b9c9ff]" strokeWidth={1.9} />
                  <p className="mt-2.5 text-[13px] font-semibold leading-tight">{title}</p>
                  <p className="mt-0.5 text-xs text-blue-100/55">{text}</p>
                </li>)}
              </ul>
            </div>

            <div className="relative z-10 flex items-center justify-between gap-4 border-t border-white/10 pt-5 text-xs text-blue-100/60">
              <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#b9c9ff]" />Secure access for ACLC faculty and students</span>
              <span className="hidden font-mono text-[11px] xl:inline">© {new Date().getFullYear()} ACLC College</span>
            </div>
          </aside>

          <section className="flex min-h-0 items-center justify-center overflow-hidden px-5 py-3 sm:px-10 sm:py-5 md:py-8 lg:px-12">
            <form onSubmit={submit} className="mx-auto w-full max-w-[390px] space-y-4">
              <Link href="/" title="Back to the ACLC Scheduler home page" className="mb-3 flex w-fit items-center gap-3 rounded-xl transition hover:opacity-80 md:hidden">
                <Image src="/aclc-logo.png" alt="ACLC College Manila Campus" width={40} height={40} loading="eager" className="rounded-full shadow-sm" />
                <div>
                  <p className="font-[family-name:var(--font-display)] text-base font-bold leading-tight text-ink">ACLC College</p>
                  <p className="mt-0.5 text-xs text-ink-muted">Manila Campus · Scheduler</p>
                </div>
              </Link>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">Portal sign in</p>
                <h1 className="mt-2 font-[family-name:var(--font-display)] text-[30px] font-bold tracking-tight text-ink">Welcome back</h1>
                <p className="mt-2 text-sm leading-5 text-ink-muted">Sign in with your registered email or student ID.</p>
              </div>

              {error ? <p className="rounded-xl border border-danger/20 bg-danger-soft px-3.5 py-3 text-sm text-danger" role="alert">{error}</p> : null}

              <div className="space-y-4">
                <Field label="Email or student ID">
                  <div className="relative">
                    <UserRound aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-muted" />
                    <Input type="text" autoComplete="username" value={identifier} onChange={(event) => setIdentifier(event.target.value)} required autoFocus placeholder="name@school.edu.ph or student ID" className="h-12 rounded-xl pl-11 pr-3 text-[15px]" />
                  </div>
                </Field>
                <Field label="Password">
                  <div className="relative">
                    <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-muted" />
                    <Input type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required className="h-12 rounded-xl pl-11 pr-12 text-[15px]" />
                    <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-ink-muted transition hover:bg-bg hover:text-ink">
                      {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                    </button>
                  </div>
                </Field>
                <div className="-mt-2 text-right">
                  <Link href="/reset-password" className="text-sm font-semibold text-accent hover:underline">Forgot password?</Link>
                </div>
              </div>

              <Button className="h-12 w-full rounded-xl text-[15px] shadow-md shadow-accent/15 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/20" type="submit" disabled={pending}>
                {pending ? <KeyRound className="h-[18px] w-[18px] animate-pulse" /> : <LogIn className="h-[18px] w-[18px]" />}
                {pending ? "Signing in..." : "Sign in"}
                {!pending ? <ArrowRight className="ml-auto h-4 w-4 opacity-75" /> : null}
              </Button>

              <div className="space-y-3 border-t border-line pt-5 text-center">
                <p className="text-sm text-ink-muted">
                  No password yet? <Link href="/create-password" className="font-semibold text-accent hover:underline">Create password</Link>
                </p>
              </div>
            </form>
          </section>
        </div>

      </div>
    </main>
  );
}
