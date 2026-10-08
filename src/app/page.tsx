import { statSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LandingMenu } from "@/frontend/components/landing/LandingMenu";
import {
  ArrowRight,
  Bell,
  Download,
  ChevronDown,
  CalendarDays,
  Check,
  Clock3,
  FileDown,
  QrCode,
  ScanLine,
  ShieldCheck,
  Smartphone,
  UserCog,
  Users,
} from "lucide-react";

export const metadata: Metadata = {
  title: "ACLC Scheduler · ACLC College Manila",
  description: "Class schedules, QR attendance, and attendance history for ACLC College Manila administrators, teachers, and students.",
};

// Signed-in visitors never see this page: proxy.ts sends them to their portal.

const features = [
  { icon: CalendarDays, title: "Conflict-free scheduling", text: "Build each section's week. Room, professor, and section clashes are caught before they're saved." },
  { icon: QrCode, title: "Rotating QR attendance", text: "Every student gets a personal QR that changes every 10 seconds, so codes can't be shared or reused." },
  { icon: Clock3, title: "Present, late, or absent", text: "Check-ins more than 15 minutes after class starts are marked late automatically. Teachers can correct any mark." },
  { icon: FileDown, title: "PDF attendance sheets", text: "Download a class's full attendance sheet, or a weekly schedule, in one tap." },
  { icon: Bell, title: "Notifications", text: "Schedule changes, open attendance, and account updates reach the right people right away." },
  { icon: Smartphone, title: "Teacher mobile app", text: "Teachers open attendance and scan student QRs from their phone, only during their class time." },
];

const roles = [
  { icon: UserCog, role: "Administrators", points: ["Set up terms, programs, sections, subjects, and rooms", "Schedule classes and assign professors", "Import student rosters from Excel", "Download section schedules as PDF"] },
  { icon: Users, role: "Teachers", points: ["See handled classes and the weekly calendar", "Take attendance with the mobile app", "Review each student's attendance per subject", "Export attendance sheets as PDF"] },
  { icon: QrCode, role: "Students", points: ["See your class schedule for the term", "Show your QR when attendance is open", "Track present, late, and absent per subject", "Get notified when your schedule changes"] },
];

const steps = [
  { icon: Smartphone, title: "Teacher opens attendance", text: "Available only during the subject's scheduled class time." },
  { icon: QrCode, title: "Student shows their QR", text: "It appears on the student portal by itself, no refresh needed." },
  { icon: ScanLine, title: "Scan and done", text: "Marked present or late instantly, and saved to the class history." },
];

const faqs = [
  { q: "How do I get an account?", a: "Your school administrator adds you first: teachers from the Users page, students from the section roster. Then open Create password, enter your school email (students can also use their student number), and confirm the code sent to your email." },
  { q: "I forgot my password. What do I do?", a: "Choose Forgot password on the sign-in page. We'll email a one-time code to your registered address so you can set a new password." },
  { q: "When can a teacher open attendance?", a: "Only during the subject's scheduled class: from 15 minutes before it starts until it ends, in Philippine time." },
  { q: "What counts as late?", a: "A check-in more than 15 minutes after the class's scheduled start. If attendance was opened later than that, the 15 minutes count from when it was opened. Teachers can correct any status." },
  { q: "What if my QR won't scan or my phone is dead?", a: "Tell your teacher. They can mark you present or late by hand from the class list." },
  { q: "Can I see my attendance per subject?", a: "Yes. On the student portal, open My classes and select a subject to see every session, your attendance rate, and your present, late, and absent counts." },
];

/**
 * Where the Android teacher app downloads from. In production, set
 * TEACHER_APP_URL to the GitHub Release file (TEACHER_APP_VERSION and
 * TEACHER_APP_SIZE label it). Locally, a file in public/downloads is used.
 * Null (no button) when neither exists.
 */
const LOCAL_APK = "/downloads/aclc-scheduler-teacher.apk";
function teacherApp() {
  if (process.env.TEACHER_APP_URL) {
    return { href: process.env.TEACHER_APP_URL, version: process.env.TEACHER_APP_VERSION ?? null, size: process.env.TEACHER_APP_SIZE ?? null };
  }
  try {
    const size = statSync(path.join(process.cwd(), "public", LOCAL_APK)).size;
    return { href: LOCAL_APK, version: null, size: `${Math.round(size / 1024 / 1024)} MB` };
  } catch {
    return null;
  }
}

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#attendance", label: "How attendance works" },
  { href: "#app", label: "Teacher app" },
  { href: "#faq", label: "FAQ" },
];

/** Android robot head; takes the text color. */
function AndroidIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
    <path d="M17.6 9.48l1.84-3.18a.38.38 0 0 0-.66-.38l-1.86 3.22a11.4 11.4 0 0 0-9.84 0L5.22 5.92a.38.38 0 0 0-.66.38L6.4 9.48A10.78 10.78 0 0 0 1 18h22a10.78 10.78 0 0 0-5.4-8.52zM7 15.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm10 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z" />
  </svg>;
}

function Logo({ size }: { size: number }) {
  return <span className="inline-flex shrink-0 rounded-full bg-white p-[2px] shadow-md shadow-black/20">
    <Image src="/aclc-logo.png" alt="ACLC College Manila Campus" width={size} height={size} loading="eager" className="rounded-full" />
  </span>;
}

export default function LandingPage() {
  const app = teacherApp();
  return <div className="min-h-screen bg-bg-elevated text-ink">
    {/* Navigation */}
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#070d1f]/80 text-white backdrop-blur-md">
      <div className="relative mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo size={34} />
          <span className="leading-tight">
            <span className="block font-[family-name:var(--font-display)] text-[15px] font-bold">ACLC Scheduler</span>
            <span className="block font-mono text-[10px] tracking-wide text-blue-100/60">MANILA CAMPUS</span>
          </span>
        </Link>
        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-7 text-sm text-blue-100/70 lg:flex">
          {navLinks.map((link) => <a key={link.href} href={link.href} className="transition hover:text-white">{link.label}</a>)}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/login" className="inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#14286a] shadow-sm transition hover:bg-blue-50">Get started<ArrowRight className="h-4 w-4" /></Link>
          <LandingMenu links={navLinks} />
        </div>
      </div>
    </header>

    {/* Hero */}
    <section className="relative overflow-hidden bg-[#070d1f] pb-28 pt-32 text-white sm:pb-32 sm:pt-40">
      <div aria-hidden className="pointer-events-none absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_at_50%_20%,black_20%,transparent_75%)]" />
      <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 h-[560px] w-[560px] rounded-full bg-[radial-gradient(circle,rgba(59,100,224,0.5),transparent_65%)]" />
      <div aria-hidden className="pointer-events-none absolute -bottom-64 -left-40 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(203,24,52,0.25),transparent_65%)]" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-3 py-1 font-mono text-[11px] tracking-wide text-blue-100/85">
            <span className="h-1.5 w-1.5 rounded-full bg-[#4ade80]" />ACLC COLLEGE · MANILA CAMPUS
          </p>
          <h1 className="mt-5 font-[family-name:var(--font-display)] text-[42px] font-bold leading-[1.04] tracking-tight sm:text-6xl">
            Your school day,<br />
            <span className="bg-gradient-to-r from-[#b9c9ff] via-[#8fa9ff] to-[#6e92ff] bg-clip-text text-transparent">all in one place.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-blue-100/70 sm:text-lg">
            Class schedules, QR attendance, and attendance history for administrators, teachers, and students, on the web and on your phone.
          </p>
          <p className="mt-8 flex items-center gap-2 text-xs text-blue-100/55"><ShieldCheck className="h-4 w-4" />For registered ACLC faculty and students. Accounts are set up by the school administrator.</p>
        </div>

        <HeroPreview />
      </div>
    </section>

    {/* Features */}
    <section id="features" className="scroll-mt-20 bg-bg py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading eyebrow="Features" title="Everything a class day needs" text="From building the timetable to recording who showed up, in one connected system." />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, text }) => <article key={title} className="group rounded-2xl border border-line bg-bg-elevated p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent-soft text-accent transition group-hover:bg-accent group-hover:text-white"><Icon className="h-5 w-5" /></span>
            <h3 className="mt-5 text-base font-semibold text-ink">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-ink-muted">{text}</p>
          </article>)}
        </div>
      </div>
    </section>

    {/* How attendance works */}
    <section id="attendance" className="scroll-mt-20 bg-bg-elevated py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading eyebrow="How attendance works" title="Three steps, a few seconds each" text="No paper roll call, and no shared codes. Each check-in belongs to one student and one class." />
        <ol className="relative mt-14 grid gap-8 md:grid-cols-3">
          <div aria-hidden className="absolute left-[16%] right-[16%] top-7 hidden h-px bg-gradient-to-r from-transparent via-line to-transparent md:block" />
          {steps.map(({ icon: Icon, title, text }, index) => <li key={title} className="relative text-center">
            <span className="relative mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#070d1f] text-[#b9c9ff] shadow-lg shadow-[#070d1f]/20 ring-4 ring-bg-elevated"><Icon className="h-6 w-6" /></span>
            <p className="mt-5 font-mono text-[11px] tracking-[0.16em] text-accent">STEP 0{index + 1}</p>
            <h3 className="mt-1.5 text-lg font-semibold text-ink">{title}</h3>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-ink-muted">{text}</p>
          </li>)}
        </ol>
      </div>
    </section>

    {/* Roles */}
    <section id="roles" className="scroll-mt-20 bg-bg py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading eyebrow="For you" title="One system, three portals" text="Everyone signs in at the same place and lands in the portal made for their role." />
        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {roles.map(({ icon: Icon, role, points }) => <article key={role} className="rounded-2xl border border-line bg-bg-elevated p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#070d1f] text-[#b9c9ff]"><Icon className="h-5 w-5" /></span>
              <h3 className="text-lg font-semibold text-ink">{role}</h3>
            </div>
            <ul className="mt-5 space-y-3">
              {points.map((point) => <li key={point} className="flex gap-2.5 text-sm leading-6 text-ink-muted">
                <span className="mt-1 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-ok-soft text-ok"><Check className="h-3 w-3" strokeWidth={3} /></span>{point}
              </li>)}
            </ul>
          </article>)}
        </div>
      </div>
    </section>

    {/* Teacher app */}
    <section id="app" className="relative scroll-mt-20 overflow-hidden bg-[#070d1f] py-20 text-white sm:py-24">
      <div aria-hidden className="pointer-events-none absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_at_70%_50%,black_15%,transparent_70%)]" />
      <div aria-hidden className="pointer-events-none absolute -right-32 top-10 h-[480px] w-[480px] rounded-full bg-[radial-gradient(circle,rgba(59,100,224,0.45),transparent_65%)]" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1fr_auto]">
        <div>
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-[#b9c9ff]">Teacher app</p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">Take attendance from your phone</h2>
          <p className="mt-4 max-w-xl text-base leading-7 text-blue-100/70">The ACLC Scheduler teacher app shows your classes by day, opens attendance when class starts, and scans each student&apos;s QR in a second.</p>
          <ul className="mt-8 grid max-w-xl gap-3 sm:grid-cols-2">
            {[
              "Classes grouped by day, in Philippine time",
              "Live class list: present, late, not yet",
              "Tap a student to correct their status",
              "History by day and by subject",
              "Attendance sheet PDF in one tap",
              "Notifications when your schedule changes",
            ].map((item) => <li key={item} className="flex gap-2.5 text-sm leading-6 text-blue-100/80">
              <span className="mt-1 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-[#22c55e]/20 text-[#4ade80]"><Check className="h-3 w-3" strokeWidth={3} /></span>{item}
            </li>)}
          </ul>
          {app ? <div className="mt-10">
            <a href={app.href} download className="group inline-flex items-center gap-3 rounded-lg bg-white py-2.5 pl-2.5 pr-4 shadow-sm ring-1 ring-black/5 transition hover:bg-accent-soft">
              <span className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-md bg-accent text-white">
                <AndroidIcon className="h-6 w-6" />
                <span className="absolute inset-x-0 bottom-0 h-1 bg-brand" />
              </span>
              <span className="text-left leading-tight">
                <span className="block text-xs font-medium text-ink-muted">Download the app for</span>
                <span className="block font-[family-name:var(--font-display)] text-base font-bold text-ink">Android</span>
              </span>
              <Download className="ml-3 h-[18px] w-[18px] text-accent transition group-hover:translate-y-0.5" />
            </a>
            <div className="mt-4 flex flex-wrap gap-2 font-mono text-[11px] text-blue-100/70">
              {[app.version ? `v${app.version}` : null, app.size ? `APK · ${app.size}` : "APK", "Android 7.0 or later"].filter((chip): chip is string => Boolean(chip)).map((chip) => <span key={chip} className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1">{chip}</span>)}
            </div>
          </div> : null}
          <p className="mt-6 max-w-xl text-sm leading-6 text-blue-100/55">{app ? "When Android asks, allow installs from your browser. " : "Ask your school administrator for the app. "}Teachers sign in with the same email and password as the web portal.</p>
        </div>
        <PhonePreview />
      </div>
    </section>

    {/* FAQ */}
    <section id="faq" className="scroll-mt-20 bg-bg-elevated py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <SectionHeading eyebrow="FAQ" title="Questions, answered" text="The things people usually ask before their first class." />
        <div className="mt-10 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-bg-elevated shadow-sm">
          {faqs.map((item) => <details key={item.q} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left font-medium text-ink transition hover:bg-bg [&::-webkit-details-marker]:hidden">
              {item.q}
              <ChevronDown className="h-4 w-4 shrink-0 text-ink-muted transition group-open:rotate-180" />
            </summary>
            <p className="px-5 pb-5 text-sm leading-6 text-ink-muted">{item.a}</p>
          </details>)}
        </div>
      </div>
    </section>

    {/* Call to action */}
    <section className="bg-bg-elevated px-4 pb-20 sm:px-6 sm:pb-24">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-[#070d1f] px-6 py-14 text-center text-white sm:px-12">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-32 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(59,100,224,0.5),transparent_65%)]" />
        <div aria-hidden className="pointer-events-none absolute -bottom-40 -left-24 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(203,24,52,0.25),transparent_65%)]" />
        <div className="relative">
          <Logo size={56} />
          <h2 className="mt-5 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">Ready for class?</h2>
          <p className="mx-auto mt-3 max-w-md text-blue-100/70">Sign in with your registered email or student number.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/login" className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-[15px] font-semibold text-[#14286a] transition hover:bg-blue-50">Sign in<ArrowRight className="h-4 w-4" /></Link>
            <Link href="/create-password" className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-6 py-3.5 text-[15px] font-semibold text-white/90 transition hover:bg-white/10">Create password</Link>
          </div>
        </div>
      </div>
    </section>

    {/* Footer */}
    <footer className="border-t border-line bg-bg">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <Logo size={36} />
            <span className="leading-tight">
              <span className="block font-[family-name:var(--font-display)] font-bold text-ink">ACLC Scheduler</span>
              <span className="block text-xs text-ink-muted">ACLC College · Manila Campus</span>
            </span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-6 text-ink-muted">Class scheduling and QR attendance for administrators, teachers, and students.</p>
        </div>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">Portal</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link href="/login" className="text-ink hover:text-accent">Sign in</Link></li>
            <li><Link href="/create-password" className="text-ink hover:text-accent">Create password</Link></li>
            <li><Link href="/reset-password" className="text-ink hover:text-accent">Forgot password</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">Learn more</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            {[...navLinks, { href: "#roles", label: "For you" }].map((link) => <li key={link.href}><a href={link.href} className="text-ink hover:text-accent">{link.label}</a></li>)}
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-ink-muted sm:px-6">© {new Date().getFullYear()} ACLC College · Manila Campus. For registered faculty and students.</p>
      </div>
    </footer>
  </div>;
}

function SectionHeading({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return <div className="mx-auto max-w-2xl text-center">
    <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-accent">{eyebrow}</p>
    <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-ink sm:text-4xl">{title}</h2>
    <p className="mt-4 text-base leading-7 text-ink-muted">{text}</p>
  </div>;
}

/** Illustrative product preview: a weekly grid and a live attendance card. */
function HeroPreview() {
  const blocks = [
    { day: 0, top: 18, height: 40, code: "GE6114", room: "Online", online: true },
    { day: 0, top: 62, height: 58, code: "ITE6101", room: "COMLAB 1" },
    { day: 1, top: 18, height: 70, code: "IT6210", room: "COMLAB 1" },
    { day: 3, top: 40, height: 44, code: "FILI6201", room: "RM 301" },
    { day: 4, top: 8, height: 36, code: "GE6100", room: "RM 204" },
  ];
  return <div aria-hidden className="relative mx-auto w-full max-w-[520px] lg:mx-0">
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-3 shadow-2xl shadow-black/40 backdrop-blur-sm">
      <div className="rounded-2xl bg-white p-4 text-ink">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] tracking-wide text-accent">WEEKLY SCHEDULE</p>
            <p className="text-sm font-semibold">BSIS A1 · 1st Semester</p>
          </div>
          <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-semibold text-accent">5 classes</span>
        </div>
        <div className="mt-4 grid grid-cols-5 gap-1.5">
          {["MON", "TUE", "WED", "THU", "FRI"].map((day, index) => <div key={day}>
            <p className="pb-1.5 text-center text-[10px] font-semibold text-ink-muted">{day}</p>
            <div className="relative h-36 rounded-lg bg-bg">
              {blocks.filter((block) => block.day === index).map((block) => <div key={block.code} className={`absolute inset-x-1 rounded-md px-1.5 py-1 ${block.online ? "border border-dashed border-ink-muted/40 bg-white" : "border-l-2 border-accent bg-accent-soft"}`} style={{ top: `${block.top}%`, height: `${block.height}%` }}>
                <p className={`truncate text-[9px] font-bold ${block.online ? "text-info" : "text-accent"}`}>{block.code}</p>
                <p className="truncate text-[8px] text-ink-muted">{block.room}</p>
              </div>)}
            </div>
          </div>)}
        </div>
      </div>
    </div>

    <div className="absolute -bottom-20 -left-4 w-56 rounded-2xl border border-white/10 bg-[#0d1733]/95 p-4 text-white shadow-2xl shadow-black/50 backdrop-blur sm:-left-10">
      <p className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-wide text-[#9af0ba]"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#4ade80]" />ATTENDANCE OPEN</p>
      <p className="mt-1.5 text-sm font-semibold">GE6114 · BSIS A1</p>
      <div className="mt-3 flex gap-1.5 text-[10px] font-semibold">
        <span className="rounded-full bg-[#15803d]/25 px-2 py-0.5 text-[#9af0ba]">24 present</span>
        <span className="rounded-full bg-[#b45309]/30 px-2 py-0.5 text-[#fcd34d]">2 late</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full w-[88%] rounded-full bg-gradient-to-r from-[#4ade80] to-[#22c55e]" /></div>
    </div>

    <div className="absolute -right-2 -top-8 flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white px-3.5 py-2.5 text-ink shadow-xl sm:-right-6">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-ok-soft text-ok"><Check className="h-4 w-4" strokeWidth={3} /></span>
      <span>
        <span className="block text-xs font-semibold">Present · 7:58 AM</span>
        <span className="block font-mono text-[10px] text-ink-muted">QR scanned</span>
      </span>
    </div>
  </div>;
}

/** Illustrative phone: a teacher's live class list in the mobile app. */
function PhonePreview() {
  const rows = [
    { name: "ABAD, MARIA CLARA", time: "7:58 AM", status: "Present" },
    { name: "BAUTISTA, JUAN MIGUEL", time: "8:03 AM", status: "Present" },
    { name: "CRUZ, ANGELICA MAE", time: "8:19 AM", status: "Late" },
    { name: "DELA ROSA, MARK", time: "", status: "Not yet" },
    { name: "ESPIRITU, KRISTINE", time: "8:06 AM", status: "Present" },
  ];
  const tone = { Present: "bg-[#e3f6ea] text-[#15803d]", Late: "bg-[#fef3c7] text-[#b45309]", "Not yet": "bg-[#f1f3f7] text-[#718096]" } as const;
  return <div aria-hidden className="mx-auto w-[280px] shrink-0 rounded-[44px] border border-white/15 bg-[#0b1430] p-2.5 shadow-2xl shadow-black/60 lg:mx-0">
    <div className="overflow-hidden rounded-[36px] bg-[#f4f6fa] text-ink">
      <div className="flex items-center justify-between bg-white px-5 pb-3 pt-4">
        <span className="font-mono text-[10px] text-ink-muted">8:21</span>
        <span className="h-4 w-16 rounded-full bg-[#0b1430]" />
        <span className="font-mono text-[10px] text-ink-muted">5G</span>
      </div>
      <div className="bg-gradient-to-br from-[#172b5b] to-[#3157b1] px-4 py-4 text-white">
        <p className="text-sm font-semibold">GE6114 · Mathematics</p>
        <p className="mt-0.5 flex items-center gap-1.5 font-mono text-[9px] tracking-wide text-[#9af0ba]"><span className="h-1.5 w-1.5 rounded-full bg-[#4ade80]" />BSIS A1 · READY TO SCAN</p>
      </div>
      <div className="grid grid-cols-3 gap-1.5 px-3 pt-3">
        {[["24", "Present", "text-[#15803d]"], ["2", "Late", "text-[#b45309]"], ["1", "Not yet", "text-[#718096]"]].map(([value, label, color]) => <div key={label} className="rounded-xl border border-line bg-white px-2 py-1.5">
          <p className={`text-base font-bold leading-tight ${color}`}>{value}</p>
          <p className="text-[9px] text-ink-muted">{label}</p>
        </div>)}
      </div>
      <div className="m-3 overflow-hidden rounded-2xl border border-line bg-white">
        {rows.map((row) => <div key={row.name} className="flex items-center gap-2 border-b border-line/70 px-3 py-2 last:border-b-0">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-soft text-[8px] font-semibold text-accent">{row.name.split(/[ ,]+/).slice(0, 2).map((part) => part[0]).join("")}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[10px] font-medium">{row.name}</span>
            <span className="block font-mono text-[8px] text-ink-muted">{row.time || "—"}</span>
          </span>
          <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-semibold ${tone[row.status as keyof typeof tone]}`}>{row.status}</span>
        </div>)}
      </div>
      <div className="px-3 pb-5">
        <div className="flex items-center justify-center gap-2 rounded-xl bg-[#203d91] py-2.5 text-[11px] font-semibold text-white"><ScanLine className="h-3.5 w-3.5" />Scan student QR</div>
      </div>
    </div>
  </div>;
}
