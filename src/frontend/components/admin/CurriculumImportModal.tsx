"use client";

import { Button } from "@/frontend/components/ui/Button";
import { Field, Input } from "@/frontend/components/ui/Field";
import { useAcademicStore } from "@/frontend/context/AcademicStore";
import type { Program, ProgramCurriculumCourse, Subject } from "@/shared/types";
import { FileUp, LoaderCircle, X } from "lucide-react";
import { useMemo, useState } from "react";

type ParsedCurriculum = {
  programCode: string;
  programName: string;
  subjects: Omit<Subject, "id">[];
  curriculum: ProgramCurriculumCourse[];
};

export function CurriculumImportModal({ program, semester, onClose, onImported }: { program: Program; semester: ProgramCurriculumCourse["semester"]; onClose: () => void; onImported: (message: string) => void }) {
  const { subjects, updateProgram, addSubject } = useAcademicStore();
  const [files, setFiles] = useState<File[]>([]);
  const [parsed, setParsed] = useState<ParsedCurriculum | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const semesterCurriculum = useMemo(
    () => parsed?.curriculum.filter((row) => row.semester === semester) ?? [],
    [parsed, semester],
  );
  const semesterSubjectCodes = useMemo(() => new Set(semesterCurriculum.map((row) => row.code.toUpperCase())), [semesterCurriculum]);
  const semesterSubjects = useMemo(
    () => parsed?.subjects.filter((subject) => semesterSubjectCodes.has(subject.code.toUpperCase())) ?? [],
    [parsed, semesterSubjectCodes],
  );
  const missingSubjects = useMemo(
    () => semesterSubjects.filter((subject) => !subjects.some((existing) => existing.code.toUpperCase() === subject.code.toUpperCase())),
    [semesterSubjects, subjects],
  );

  async function extract() {
    if (!files.length) return;
    setBusy(true);
    setError("");
    setParsed(null);
    try {
      const form = new FormData();
      files.forEach((file) => form.append("files", file));
      const response = await fetch("/api/admin/curriculum-import", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "Could not read the PDF files.");
      const curriculum = result.curriculum as ProgramCurriculumCourse[];
      const uniqueSubjects = result.subjects as Omit<Subject, "id">[];
      setParsed({ programCode: result.programCode, programName: result.programName, subjects: uniqueSubjects, curriculum });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not read the PDF files.");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!parsed) return;
    setBusy(true);
    setError("");

    try {
      const curriculum = [
        ...(program.curriculum ?? []).filter((row) => row.semester !== semester),
        ...semesterCurriculum.map((row) => ({ ...row, code: row.code.toUpperCase() })),
      ];
      await updateProgram(program.id, { curriculum });
      for (const subject of missingSubjects) await addSubject({ ...subject, track: program.track });
      const skipped = semesterSubjects.length - missingSubjects.length;
      onImported(`${semester} curriculum saved: ${missingSubjects.length} subjects added${skipped ? `, ${skipped} existing subjects skipped` : ""}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save the curriculum.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <section className="flex max-h-[92vh] w-full max-w-5xl flex-col rounded-xl border border-line bg-bg-elevated shadow-xl">
        <header className="flex items-center justify-between border-b border-line px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-ink">Import {semester} curriculum to {program.code}</h2>
            <p className="mt-1 text-xs text-ink-muted">Only {semester} entries will be saved. The other semester stays unchanged.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-ink-muted hover:bg-bg hover:text-ink"><X className="h-4 w-4" /></button>
        </header>

        <div className="min-h-0 space-y-4 overflow-y-auto px-6 py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Field label="Curriculum PDF files" className="flex-1">
              <Input type="file" accept=".pdf,application/pdf" multiple onChange={(event) => { setFiles(Array.from(event.target.files ?? [])); setParsed(null); setError(""); }} />
            </Field>
            <Button type="button" variant="secondary" disabled={!files.length || busy} onClick={extract}>
              {busy && !parsed ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
              Extract PDF
            </Button>
          </div>

          {parsed ? <>
            <div className="rounded-lg border border-line bg-bg px-3 py-2 text-sm">
              <span className="font-semibold text-ink">Destination: {program.code}</span><span className="text-ink-muted"> · {program.name}</span>
              <p className="mt-1 text-xs text-ink-muted">PDF curriculum: {parsed.programCode} · {parsed.programName}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
              <span className="rounded-full bg-accent-soft px-2.5 py-1 font-semibold text-accent">{semesterSubjects.length} unique subjects for {semester}</span>
              <span className="rounded-full bg-bg px-2.5 py-1">{semesterCurriculum.length} {semester} entries with year and prerequisites</span>
              <span className="rounded-full bg-bg px-2.5 py-1">{missingSubjects.length} new subjects will be added</span>
            </div>
            <div className="max-h-[42vh] overflow-auto rounded-xl border border-line">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="sticky top-0 bg-bg text-ink-muted"><tr>
                  {["Year", "Semester", "Code", "Subject", "Units", "Prerequisite"].map((heading) => <th key={heading} className="px-3 py-2.5 font-semibold">{heading}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-line">
                  {semesterCurriculum.map((row, index) => <tr key={`${row.yearLevel}-${row.semester}-${row.code}-${index}`}>
                    <td className="px-3 py-2">{row.yearLevel}</td><td className="px-3 py-2">{row.semester}</td><td className="px-3 py-2 font-semibold text-accent">{row.code}</td>
                    <td className="px-3 py-2">{parsed.subjects.find((subject) => subject.code === row.code)?.name}</td><td className="px-3 py-2">{parsed.subjects.find((subject) => subject.code === row.code)?.units}</td><td className="px-3 py-2">{row.prerequisite || "—"}</td>
                  </tr>)}
                </tbody>
              </table>
            </div>
          </> : null}

          <p className="text-xs text-ink-muted">Subjects from {semester} will be added to Setup and assigned to this program by year. Other semester curriculum entries will be kept as is.</p>
          {error ? <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p> : null}
        </div>

        <footer className="flex justify-end gap-2 border-t border-line bg-bg/50 px-6 py-3.5">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          {parsed ? <Button type="button" disabled={busy || !semesterCurriculum.length} onClick={save}>{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}Import {semester} to {program.code}</Button> : null}
        </footer>
      </section>
    </div>
  );
}
