"use client";

import { Badge } from "@/frontend/components/ui/Badge";
import { Button } from "@/frontend/components/ui/Button";
import { CurriculumImportModal } from "@/frontend/components/admin/CurriculumImportModal";
import { DataTable, EditModal, RowActions, useToast } from "@/frontend/components/ui/Crud";
import { Field, Input, Select } from "@/frontend/components/ui/Field";
import { PageHeader, Panel } from "@/frontend/components/ui/Page";
import { LEVEL_OPTIONS, termLabel, useAcademicStore } from "@/frontend/context/AcademicStore";
import type { Section } from "@/shared/types";
import { ArrowLeft, FileUp, GraduationCap, Plus } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

const CURRICULUM_SEMESTERS = ["1st Semester", "2nd Semester"] as const;

export default function ProgramSectionsPage() {
  const { id } = useParams<{ id: string }>();
  const { programs, sections, subjects, activeTerm, addSection, updateSection, deleteSection } = useAcademicStore();
  const program = programs.find((item) => item.id === id);
  const programSections = sections.filter((section) => section.program === program?.code);
  const levels = program ? LEVEL_OPTIONS[program.track] : [];
  const [editing, setEditing] = useState<Section | null | undefined>(undefined);
  const [importOpen, setImportOpen] = useState(false);
  const [importSemester, setImportSemester] = useState<(typeof CURRICULUM_SEMESTERS)[number]>("1st Semester");
  const [selectedLevelName, setSelectedLevelName] = useState("");
  const [selectedSemester, setSelectedSemester] = useState<(typeof CURRICULUM_SEMESTERS)[number]>("1st Semester");
  const { flash, toast } = useToast();
  const selectedLevel = levels.find((level) => level.name === selectedLevelName) ?? levels[0];
  const selectedCourses = program?.curriculum?.filter((course) => course.yearLevel === selectedLevel?.name && course.semester === selectedSemester) ?? [];
  const selectedSections = selectedLevel
    ? programSections.filter((section) => section.yearLevel === selectedLevel.name).sort((a, b) => a.name.localeCompare(b.name))
    : [];

  if (!program) return <div className="rounded-xl border border-line bg-bg-elevated p-8 text-center"><p className="font-semibold">Program not found</p><Link href="/admin/programs" className="mt-3 inline-block text-sm font-semibold text-accent">Back to programs</Link></div>;

  return <div>
    <Link href="/admin/programs" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-ink-muted hover:text-accent"><ArrowLeft className="h-4 w-4" />Programs</Link>
    <PageHeader title={`${program.code} · Program`} description={`${program.name}${activeTerm ? ` · ${termLabel(activeTerm)}` : " · Create a term to manage sections"}`} actions={<Button disabled={!activeTerm || !selectedLevel} onClick={() => setEditing({ id: "", termId: "", program: program.code, yearLevel: selectedLevel?.name ?? levels[0]?.name ?? "", name: "" })}><Plus className="h-4 w-4" />Add section</Button>} />

    <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {levels.map((level, index) => {
        const levelCourses = program.curriculum?.filter((course) => course.yearLevel === level.name).length ?? 0;
        const levelSections = programSections.filter((section) => section.yearLevel === level.name).length;
        const selected = selectedLevel?.name === level.name;
        return <button key={level.name} type="button" onClick={() => setSelectedLevelName(level.name)} aria-pressed={selected} className={`group rounded-xl border bg-bg-elevated p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${selected ? "border-accent ring-2 ring-accent/15" : "border-line hover:border-accent/40"}`}>
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{program.track === "college" ? `Year ${index + 1}` : "Grade level"}</p><h2 className="mt-1 text-base font-bold text-ink">{level.name}</h2></div>
            <span className={`rounded-lg p-2 ${selected ? "bg-accent-soft text-accent" : "bg-bg text-ink-muted"}`}><GraduationCap className="h-5 w-5" /></span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-bg px-2.5 py-1 text-ink-muted">{levelCourses} subjects</span><span className="rounded-full bg-bg px-2.5 py-1 text-ink-muted">{levelSections} sections</span></div>
        </button>;
      })}
    </div>

    {selectedLevel ? <Panel className="mb-5" title={`${selectedLevel.name} · Curriculum`} action={program.track === "college" ? <Button variant="secondary" className="h-9 px-3 text-xs" onClick={() => { setImportSemester(selectedSemester); setImportOpen(true); }}><FileUp className="h-4 w-4" />Import {selectedSemester} curriculum</Button> : null}>
      <p className="mb-4 text-xs text-ink-muted">Choose a semester to view only its curriculum. Semester assignments from the imported PDF are kept separate.</p>
      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Curriculum semester">
        {CURRICULUM_SEMESTERS.map((semester) => {
          const count = program.curriculum?.filter((course) => course.yearLevel === selectedLevel.name && course.semester === semester).length ?? 0;
          const selected = selectedSemester === semester;
          return <button key={semester} type="button" role="tab" aria-selected={selected} onClick={() => setSelectedSemester(semester)} className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${selected ? "border-accent bg-accent text-white shadow-sm" : "border-line bg-bg-elevated text-ink-muted hover:border-accent/40 hover:text-accent"}`}>
            {semester}<span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${selected ? "bg-white/20 text-white" : "bg-bg text-ink-muted"}`}>{count}</span>
          </button>;
        })}
      </div>
      {selectedCourses.length ? <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[680px] border-collapse text-left">
          <thead><tr className="bg-accent text-white"><th className="w-12 border-r border-white/20 px-3 py-3 text-center text-xs font-bold">#</th><th className="px-4 py-3 text-xs font-bold">{selectedSemester}</th></tr></thead>
          <tbody>{selectedCourses.map((course, rowIndex) => {
            const subject = subjects.find((item) => item.code.toUpperCase() === course.code.toUpperCase());
            return <tr key={`${course.code}-${rowIndex}`} className="border-t border-line">
              <th scope="row" className="w-12 border-r border-line bg-bg px-3 py-3 text-center text-xs font-semibold text-ink-muted">{rowIndex + 1}</th>
              <td className="p-3">
                <div className="flex flex-col gap-1 rounded-lg border border-line bg-bg p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div className="min-w-0"><span className="text-xs font-bold text-accent">{course.code}</span><p className="mt-1 text-sm font-medium leading-5 text-ink">{subject?.name ?? "Subject details unavailable"}</p></div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs text-ink-muted"><span className="rounded-full bg-bg-elevated px-2.5 py-1">{subject ? `${subject.units} units` : "Units not set"}</span><span className="rounded-full bg-bg-elevated px-2.5 py-1">{course.prerequisite.trim() ? `Prerequisite: ${course.prerequisite}` : "No prerequisite"}</span></div>
                </div>
              </td>
            </tr>;
          })}</tbody>
        </table>
      </div> : <div className="rounded-lg border border-dashed border-line bg-bg/40 px-5 py-12 text-center">
        <GraduationCap className="mx-auto h-8 w-8 text-ink-muted" />
        <p className="mt-3 text-sm font-semibold text-ink">No {selectedSemester} curriculum for {selectedLevel.name} yet</p>
        <p className="mt-1 text-sm text-ink-muted">{program.track === "college" ? "Import a curriculum PDF to add the subjects with their semester assignments." : "Subjects assigned to this semester and level will appear here."}</p>
      </div>}
    </Panel> : null}

    {!activeTerm ? <div className="mb-5 rounded-xl border border-warn/30 bg-warn-soft px-4 py-3 text-sm text-warn">Select or create an academic term from the sidebar before adding sections.</div> : null}
    {selectedLevel ? <Panel className="mb-4" title={`${selectedLevel.name} sections`} action={<Button variant="secondary" className="h-8 px-3 text-xs" disabled={!activeTerm} onClick={() => setEditing({ id: "", termId: "", program: program.code, yearLevel: selectedLevel.name, name: "" })}><Plus className="h-3.5 w-3.5" />Add section</Button>}>
      {selectedSections.length ? <DataTable head={["Section", "Year level", ""]} rows={selectedSections.map((section) => [<Link key="name" href={`/admin/sections/${section.id}`} className="font-semibold text-accent hover:underline">{section.name}</Link>, <Badge key="level" tone="neutral">{section.yearLevel}</Badge>, <RowActions key="actions" onEdit={() => setEditing(section)} onDelete={async () => { if (window.confirm(`Delete ${section.name} and its scheduled classes?`)) { try { await deleteSection(section.id); flash("Section deleted"); } catch (error) { flash(error instanceof Error ? error.message : "Could not delete section"); } } }} />])} /> : <div className="py-6 text-center text-sm text-ink-muted">No sections in {selectedLevel.name} for this term yet.</div>}
    </Panel> : null}

    {editing !== undefined ? <EditModal title={editing?.id ? "Edit section" : "Add section"} onClose={() => setEditing(undefined)} onSubmit={async (fd) => {
      if (!activeTerm) return;
      const name = String(fd.get("name")).trim(); const yearLevel = String(fd.get("yearLevel"));
      if (sections.some((section) => section.name.toLowerCase() === name.toLowerCase() && section.id !== editing?.id)) { flash(`${name} already exists in this term`); return; }
      try {
        if (editing?.id) { await updateSection(editing.id, { name, yearLevel }); flash("Section updated"); }
        else { await addSection({ name, yearLevel, program: program.code }); flash(`${name} added`); }
        setEditing(undefined);
      } catch (error) {
        flash(error instanceof Error ? error.message : "Could not save section");
      }
    }}>
      <Field label="Section name"><Input name="name" required autoFocus defaultValue={editing?.name} placeholder="BSIT 1-A" /></Field>
      <Field label="Year level"><Select name="yearLevel" defaultValue={editing?.yearLevel ?? selectedLevel?.name ?? levels[0]?.name}>{levels.map((level) => <option key={level.name} value={level.name}>{level.name}</option>)}</Select></Field>
    </EditModal> : null}
    {importOpen ? <CurriculumImportModal program={program} semester={importSemester} onClose={() => setImportOpen(false)} onImported={(message) => { setImportOpen(false); flash(message); }} /> : null}
    {toast}
  </div>;
}
