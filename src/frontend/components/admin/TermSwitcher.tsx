"use client";

import { Field, Input, Select } from "@/frontend/components/ui/Field";
import { EditModal } from "@/frontend/components/ui/Crud";
import { SEMESTERS, sortTerms, termLabel, useAcademicStore } from "@/frontend/context/AcademicStore";
import type { Semester } from "@/shared/types";
import { CalendarRange, Settings2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

/** Selects the active term used by the scheduling pages. */
export function TermSwitcher({ manageHref }: { manageHref?: string }) {
  const { terms, activeTerm, setActiveTerm, setupLoading, setupError } = useAcademicStore();

  if (setupLoading) {
    return <p className="rounded-lg border border-line px-3 py-2.5 text-xs text-ink-muted">Loading terms…</p>;
  }

  if (setupError) {
    return <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2.5 text-xs text-danger">Database unavailable: {setupError}</p>;
  }

  if (terms.length === 0) {
    return manageHref ? (
      <Link
        href={manageHref}
        className="flex items-center gap-2 rounded-lg border border-dashed border-accent/40 bg-accent-soft/50 px-3 py-2.5 text-sm font-medium text-accent hover:bg-accent-soft"
      >
        <CalendarRange className="h-4 w-4" />
        Create the first term
      </Link>
    ) : (
      <p className="rounded-lg border border-line px-3 py-2.5 text-xs text-ink-muted">
        No term has been set up yet.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between px-1">
        <label htmlFor="term-switcher" className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted/80">
          Term
        </label>
        {manageHref ? (
          <Link
            href={manageHref}
            title="Manage terms"
            className="rounded p-0.5 text-ink-muted hover:text-accent"
          >
            <Settings2 className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </div>
      <Select
        id="term-switcher"
        value={activeTerm?.id ?? ""}
        onChange={(e) => setActiveTerm(e.target.value)}
        className="h-auto bg-accent-soft/40 py-2 text-[13px] font-medium"
      >
        {sortTerms(terms).map((t) => (
          <option key={t.id} value={t.id}>
            {termLabel(t, true)}
          </option>
        ))}
      </Select>
    </div>
  );
}

/** Form for a new academic year + semester. The new term becomes active. */
export function AddTermModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (message: string) => void;
}) {
  const { terms, activeTerm, allSections, addTerm, copySections } = useAcademicStore();
  const [startYear, setStartYear] = useState(
    () => activeTerm?.startYear ?? new Date().getFullYear(),
  );
  const [error, setError] = useState<string | null>(null);
  const previous = activeTerm && allSections.some((section) => section.termId === activeTerm.id)
    ? activeTerm
    : undefined;

  return (
    <EditModal
      title="New term"
      submitLabel="Create term"
      onClose={onClose}
      onSubmit={async (fd) => {
        const year = Number(fd.get("startYear"));
        const semester = String(fd.get("semester")) as Semester;
        if (!Number.isInteger(year) || year < 2000 || year > 2100) {
          setError("Enter a valid starting year, e.g. 2026.");
          return;
        }
        if (terms.some((t) => t.startYear === year && t.semester === semester)) {
          setError(`A.Y. ${year}–${year + 1} · ${semester} already exists.`);
          return;
        }
        try {
          const term = await addTerm(year, semester);
          let copied = 0;
          if (previous && fd.get("copy") === "on") copied = await copySections(previous.id, term.id);
          onCreated(
            `${termLabel(term)} created${copied ? ` with ${copied} section${copied === 1 ? "" : "s"} copied` : ""}`,
          );
        } catch (requestError) {
          setError(requestError instanceof Error ? requestError.message : "Could not save the term.");
        }
      }}
    >
      {error ? (
        <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Academic year starts">
          <Input
            name="startYear"
            type="number"
            required
            autoFocus
            value={startYear}
            onChange={(e) => setStartYear(Number(e.target.value))}
          />
        </Field>
        <Field label="Semester">
          <Select name="semester" defaultValue="1st Semester">
            {SEMESTERS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <p className="-mt-2 text-xs text-ink-muted">
        Saves as <strong>A.Y. {startYear}–{startYear + 1}</strong>
      </p>
      {previous ? (
        <label className="flex items-start gap-2 rounded-lg border border-line px-3 py-2.5 text-sm">
          <input type="checkbox" name="copy" defaultChecked className="mt-0.5 accent-[var(--accent)]" />
          <span>
            Copy sections from <strong>{termLabel(previous)}</strong>
            <span className="block text-xs text-ink-muted">Classes are not copied — only section names, programs, and year levels.</span>
          </span>
        </label>
      ) : null}
    </EditModal>
  );
}
