"use client";

import { Avatar } from "@/frontend/components/ui/Avatar";
import { NotificationBell, useNotifications } from "@/frontend/components/layout/NotificationBell";
import { cn } from "@/shared/lib/utils";
import type { LucideIcon } from "lucide-react";
import { ChevronRight, LogOut, Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** The ACLC College Manila Campus seal on a white disc. Size it with height and width classes. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex h-9 w-9 shrink-0 rounded-full bg-white shadow-sm ring-1 ring-black/5", className)}>
      <Image src="/aclc-logo.png" alt="ACLC College" fill sizes="64px" className="rounded-full object-contain p-[2px]" />
    </span>
  );
}

export function AppShell({
  subtitle,
  nav,
  children,
  userLabel,
  userRole,
}: {
  brand?: string;
  subtitle: string;
  nav: NavItem[];
  children: React.ReactNode;
  userLabel: string;
  userRole: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootHref = nav[0]?.href;
  const profileHref = `${rootHref}/profile`;
  const notifications = useNotifications();

  async function signOut() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.assign("/login");
    }
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-[248px] border-r border-line bg-sidebar text-sidebar-ink transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-2.5 py-5 pb-4 pl-5 pr-3">
            <BrandMark />
            <div className="min-w-0">
              <p className="whitespace-nowrap font-[family-name:var(--font-display)] text-[15px] font-bold leading-tight text-ink">
                ACLC Scheduler
              </p>
              <p className="truncate text-xs text-ink-muted">{subtitle}</p>
            </div>
            <NotificationBell state={notifications} className="ml-auto hidden lg:block" />
            <button
              type="button"
              className="ml-auto rounded-lg p-1.5 text-ink-muted hover:bg-bg lg:hidden"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
            <p className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wider text-ink-muted/80">
              Menu
            </p>
            {nav.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== rootHref && pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                    active
                      ? "bg-accent-soft text-accent"
                      : "text-ink-muted hover:bg-bg hover:text-ink",
                  )}
                >
                  {active ? (
                    <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-r bg-brand" />
                  ) : null}
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-line p-3">
            <div className="flex items-center gap-1 rounded-lg">
              <Link
                href={profileHref}
                onClick={() => setOpen(false)}
                aria-current={pathname === profileHref ? "page" : undefined}
                title="Your profile"
                className={cn(
                  "group flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-bg",
                  pathname === profileHref && "bg-accent-soft",
                )}
              >
                <Avatar name={userLabel} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{userLabel}</p>
                  <p className="truncate text-xs text-ink-muted">{userRole}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted opacity-0 transition group-hover:opacity-100" />
              </Link>
              <button
                type="button"
                onClick={() => void signOut()}
                title="Sign out"
                aria-label="Sign out"
                className="rounded-lg p-1.5 text-ink-muted transition hover:bg-bg hover:text-ink"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {open ? (
        <button
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-ink/30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-bg-elevated px-4 py-3 lg:hidden">
          <button
            className="rounded-lg border border-line p-2 text-ink"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <BrandMark className="h-8 w-8" />
          <p className="font-[family-name:var(--font-display)] text-sm font-bold text-ink">
            ACLC Scheduler
          </p>
          <NotificationBell state={notifications} align="right" className="ml-auto" />
        </header>
        <main className="page-shell mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
