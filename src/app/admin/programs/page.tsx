"use client";

import { Badge } from "@/frontend/components/ui/Badge";
import { Button } from "@/frontend/components/ui/Button";
import { DataTable, EditModal, EmptyCard, RowActions, useToast } from "@/frontend/components/ui/Crud";
import { Field, Input } from "@/frontend/components/ui/Field";
import { PageHeader, Tabs } from "@/frontend/components/ui/Page";
import { termLabel, useAcademicStore } from "@/frontend/context/AcademicStore";
import type { Program, Track } from "@/shared/types";
import { ArrowUpRight, BookOpen, ChevronRight, GraduationCap, Plus, School } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const trackLabel = (track: Track) => (track === "senior_high" ? "Senior High" : "College");
type ProgramModal = { track: Track; editing?: Program };

export default function ProgramsPage() {
  const router = useRouter();
  const { programs, sections, allSections, activeTerm, addProgram, updateProgram, deleteProgram } = useAcademicStore();
  const { flash, toast } = useToast();
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(() => programs[0]?.track ?? null);
  const [modal, setModal] = useState<ProgramModal | null>(null);
  const activeTrack = selectedTrack ?? programs[0]?.track ?? null;
  const visiblePrograms = programs
    .filter((program) => activeTrack !== null && program.track === activeTrack)
    .sort((a, b) => a.code.localeCompare(b.code));

  function beginCreate(track: Track) {
    setSelectedTrack(track);
    setModal({ track });
  }

  const createActions = (
    <>
      <Button variant="secondary" onClick={() => beginCreate("college")}>
        <Plus className="h-4 w-4" /> Create College
      </Button>
      <Button onClick={() => beginCreate("senior_high")}>
        <Plus className="h-4 w-4" /> Create Senior High
      </Button>
    </>
  );

  return (
    <div>
      <PageHeader
        title="Programs & sections"
        description={activeTerm
          ? `Create programs and sections for ${termLabel(activeTerm)}.`
          : "Create a college program or Senior High strand to get started."}
        actions={programs.length ? createActions : undefined}
      />

      {programs.length === 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={() => beginCreate("college")}
            className="group flex min-h-48 items-center gap-5 rounded-2xl border border-line bg-bg-elevated p-6 text-left shadow-sm transition hover:border-accent/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-accent/20 sm:p-8"
          >
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent"><BookOpen className="h-7 w-7" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-bold uppercase tracking-wider text-ink-muted">College</span>
              <span className="mt-1 block text-lg font-semibold text-ink">Create a college program</span>
              <span className="mt-1 block text-sm text-ink-muted">Add a course such as BSIT or BSE, then create its sections.</span>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-accent">Create College<ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => beginCreate("senior_high")}
            className="group flex min-h-48 items-center gap-5 rounded-2xl border border-line bg-bg-elevated p-6 text-left shadow-sm transition hover:border-accent/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-accent/20 sm:p-8"
          >
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-warn-soft text-warn"><School className="h-7 w-7" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-bold uppercase tracking-wider text-ink-muted">Senior High</span>
              <span className="mt-1 block text-lg font-semibold text-ink">Create a strand</span>
              <span className="mt-1 block text-sm text-ink-muted">Add a strand such as STEM or ABM, then create its sections.</span>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-accent">Create Senior High<ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></span>
            </span>
          </button>
        </div>
      ) : (
        <>
          <Tabs
            value={activeTrack ?? "college"}
            onChange={setSelectedTrack}
            tabs={[
              { id: "college", label: "College", count: programs.filter((program) => program.track === "college").length },
              { id: "senior_high", label: "Senior High", count: programs.filter((program) => program.track === "senior_high").length },
            ]}
          />

          {!activeTerm ? (
            <div className="mb-5 rounded-xl border border-warn/30 bg-warn-soft px-4 py-3 text-sm text-warn">
              <span className="font-semibold">No term yet.</span> Sections belong to an academic year and semester.{" "}
              <Link href="/admin/setup#terms" className="font-medium underline underline-offset-2">Create a term</Link>{" "}
              before adding sections.
            </div>
          ) : null}

          {visiblePrograms.length === 0 ? (
            <EmptyCard
              icon={<GraduationCap className="h-6 w-6" />}
              title={`No ${trackLabel(activeTrack ?? "college")} programs yet`}
              text="Create the first program for this track."
              action={
                <Button onClick={() => beginCreate(activeTrack ?? "college")}>
                  <Plus className="h-4 w-4" /> Create {trackLabel(activeTrack ?? "college")}
                </Button>
              }
            />
          ) : (
            <DataTable
              head={["Code", "Program", "Track", "Sections this term", ""]}
              onRowClick={(index) => router.push(`/admin/programs/${visiblePrograms[index].id}`)}
              rows={visiblePrograms.map((program) => {
                const sectionCount = sections.filter((section) => section.program === program.code).length;
                const allSectionCount = allSections.filter((section) => section.program === program.code).length;
                return [
                  <span key="code" className="font-semibold text-accent">{program.code}</span>,
                  <span key="name" className="block max-w-md truncate">{program.name}</span>,
                  <Badge key="track" tone={program.track === "senior_high" ? "warn" : "info"}>{trackLabel(program.track)}</Badge>,
                  sectionCount,
                  <RowActions
                    key="actions"
                    onEdit={() => setModal({ track: program.track, editing: program })}
                    onDelete={async () => {
                      if (allSectionCount > 0) {
                        flash(`${program.code} has ${allSectionCount} section${allSectionCount === 1 ? "" : "s"}. Remove those first.`);
                        return;
                      }
                      if (window.confirm(`Delete ${program.code}?`)) {
                        try {
                          await deleteProgram(program.id);
                          flash("Program deleted");
                        } catch (error) {
                          flash(error instanceof Error ? error.message : "Could not delete the program.");
                        }
                      }
                    }}
                  >
                    <Link href={`/admin/programs/${program.id}`} className="inline-flex h-8 items-center gap-1 rounded-lg px-3 text-xs font-semibold text-accent transition hover:bg-accent-soft">
                      Sections<ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </RowActions>,
                ];
              })}
            />
          )}
        </>
      )}

      {modal ? (
        <EditModal
          title={modal.editing ? "Edit program" : `Create ${trackLabel(modal.track)} program`}
          onClose={() => setModal(null)}
          onSubmit={async (formData) => {
            const data = {
              code: String(formData.get("code")).trim().toUpperCase(),
              name: String(formData.get("name")).trim(),
              track: modal.editing?.track ?? modal.track,
            };
            if (programs.some((program) => program.code === data.code && program.id !== modal.editing?.id)) {
              flash(`${data.code} already exists`);
              return;
            }
            try {
              if (modal.editing) {
                await updateProgram(modal.editing.id, data);
                flash("Program updated");
              } else {
                await addProgram(data);
                setSelectedTrack(data.track);
                flash(`${data.code} added`);
              }
              setModal(null);
            } catch (error) {
              flash(error instanceof Error ? error.message : "Could not save the program.");
            }
          }}
        >
          <Field label="Track">
            <div className="flex h-9 items-center"><Badge tone={modal.track === "senior_high" ? "warn" : "info"}>{trackLabel(modal.track)}</Badge></div>
          </Field>
          <Field label="Code">
            <Input name="code" required autoFocus defaultValue={modal.editing?.code} placeholder={modal.track === "college" ? "BSIT" : "STEM"} />
          </Field>
          <Field label={modal.track === "college" ? "Program name" : "Strand name"}>
            <Input
              name="name"
              required
              defaultValue={modal.editing?.name}
              placeholder={modal.track === "college" ? "Bachelor of Science in Information Technology" : "Science, Technology, Engineering and Mathematics"}
            />
          </Field>
        </EditModal>
      ) : null}

      {toast}
    </div>
  );
}
